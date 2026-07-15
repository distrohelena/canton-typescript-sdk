import { createHash, randomBytes } from "node:crypto";
import {
    chmod,
    lstat,
    mkdir,
    open,
    readdir,
    readFile,
    unlink,
    link,
} from "node:fs/promises";
import { basename, dirname, parse, relative, resolve } from "node:path";

const LIVE_FUZZ_ARTIFACT_SCHEMA_VERSION = 1;

const SAFE_ARTIFACT_FILENAME = /^live-fuzz-[a-f0-9]{32}\.json$/;

export interface LiveFuzzArtifactInput {
    readonly schemaVersion: 1;
    readonly fixtureFingerprint: string;
    readonly configFingerprint: string;
    readonly runId: string;
    readonly parties: {
        readonly issuer: string;
        readonly owner: string;
    };
    readonly seed?: number;
    readonly path?: string;
    readonly depthMode: "exact" | "legacy-max";
    readonly depth: number;
    readonly actionWeights: Readonly<Record<string, number>>;
    readonly actors: readonly string[];
    readonly campaignNonce: string;
    readonly amountSuffix?: number;
    readonly payloadMarker: string;
    readonly actions: readonly Readonly<Record<string, unknown>>[];
    readonly contractId?: string;
    readonly ledgerEnds: Readonly<Record<string, string>>;
    readonly invariantFailures: readonly Readonly<Record<string, unknown>>[];
    readonly numRuns: number;
    readonly numShrinks: number;
    readonly counterexamplePath?: string;
    readonly [key: string]: unknown;
}

export interface LiveFuzzReplayIdentity {
    readonly fixtureFingerprint: string;
    readonly configFingerprint: string;
    readonly runId: string;
    readonly parties: {
        readonly issuer: string;
        readonly owner: string;
    };
}

export function liveFuzzInputKey(input: {
    readonly commands: readonly unknown[];
    readonly amountSuffix: number;
    readonly campaignNonce: bigint;
}): string {
    return canonicalLiveFuzzJson({
        commands: input.commands,
        amountSuffix: input.amountSuffix,
        campaignNonce: input.campaignNonce,
    });
}

export function selectLiveFuzzCounterexampleTrace<T>(
    details: {
        readonly failed: boolean;
        readonly counterexample?: readonly [{
            readonly commands: readonly unknown[];
            readonly amountSuffix: number;
            readonly campaignNonce: bigint;
        }];
    },
    traces: ReadonlyMap<string, T>,
): T {
    if (!details.failed || details.counterexample === undefined) {
        throw new Error("Live fuzz run did not produce a counterexample.");
    }

    const key = liveFuzzInputKey(details.counterexample[0]);

    const trace = traces.get(key);

    if (trace === undefined) {
        throw new Error("Final live fuzz counterexample has no recorded trace.");
    }

    return trace;
}

export async function listLiveFuzzArtifactPathsAsync(
    directory: string,
): Promise<readonly string[]> {
    const entries = await readdir(resolve(directory), { withFileTypes: true });

    return entries
        .filter((entry) => entry.isFile() && SAFE_ARTIFACT_FILENAME.test(entry.name))
        .map((entry) => resolve(directory, entry.name))
        .sort();
}

export function canonicalLiveFuzzJson(value: unknown): string {
    return JSON.stringify(sortJsonValue(value));
}

export function createLiveFuzzFingerprint(input: {
    readonly schemaVersion: number;
    readonly fixtureVersion: string;
    readonly templateId: string;
    readonly actors: readonly string[];
    readonly routeMatrixVersion: string;
    readonly depthMode: "exact" | "legacy-max";
    readonly depth: number;
    readonly actionWeights: Readonly<Record<string, number>>;
    readonly revertPolicy: "strict" | "permissive";
    readonly [key: string]: unknown;
}): string {
    const canonicalInput = {
        schemaVersion: input.schemaVersion,
        fixtureVersion: input.fixtureVersion,
        templateId: input.templateId,
        actors: input.actors,
        routeMatrixVersion: input.routeMatrixVersion,
        depthMode: input.depthMode,
        depth: input.depth,
        actionWeights: input.actionWeights,
        revertPolicy: input.revertPolicy,
    };

    return createHash("sha256")
        .update(canonicalLiveFuzzJson(canonicalInput))
        .digest("hex");
}

export function safeLiveFuzzArtifactFilename(
    runId: string,
    campaignNonce: string,
): string {
    const digest = createHash("sha256")
        .update(`${runId}\u0000${campaignNonce}`)
        .digest("hex")
        .slice(0, 32);

    return `live-fuzz-${digest}.json`;
}

export function serializeLiveFuzzArtifact(
    input: LiveFuzzArtifactInput,
): string {
    const allowlisted = {
        schemaVersion: input.schemaVersion,
        fixtureFingerprint: input.fixtureFingerprint,
        configFingerprint: input.configFingerprint,
        runId: input.runId,
        parties: {
            issuer: input.parties.issuer,
            owner: input.parties.owner,
        },
        ...(input.seed === undefined ? {} : { seed: input.seed }),
        ...(input.path === undefined ? {} : { path: input.path }),
        depthMode: input.depthMode,
        depth: input.depth,
        actionWeights: input.actionWeights,
        actors: input.actors,
        campaignNonce: input.campaignNonce,
        ...(input.amountSuffix === undefined ? {} : { amountSuffix: input.amountSuffix }),
        payloadMarker: input.payloadMarker,
        actions: input.actions.map((action) => ({
            ...(typeof action.kind === "string" ? { kind: action.kind } : {}),
            ...(typeof action.participant === "string"
                ? { participant: action.participant }
                : {}),
            ...(typeof action.route === "string" ? { route: action.route } : {}),
            ...(typeof action.outcome === "string"
                ? { outcome: action.outcome }
                : {}),
            ...(typeof action.statusCode === "number"
                ? { statusCode: action.statusCode }
                : {}),
        })),
        ...(input.contractId === undefined ? {} : { contractId: input.contractId }),
        ledgerEnds: {
            ...(typeof input.ledgerEnds.issuer === "string"
                ? { issuer: input.ledgerEnds.issuer }
                : {}),
            ...(typeof input.ledgerEnds.owner === "string"
                ? { owner: input.ledgerEnds.owner }
                : {}),
        },
        invariantFailures: input.invariantFailures.map((failure) => ({
            ...(typeof failure.phase === "string" ? { phase: failure.phase } : {}),
            ...(typeof failure.code === "string" ? { code: failure.code } : {}),
            ...(typeof failure.message === "string"
                ? { message: failure.message }
                : {}),
        })),
        numRuns: input.numRuns,
        numShrinks: input.numShrinks,
        ...(input.counterexamplePath === undefined
            ? {}
            : { counterexamplePath: input.counterexamplePath }),
    };

    return `${JSON.stringify(allowlisted, null, 2)}\n`;
}

export async function writeLiveFuzzArtifactAsync(
    destination: string,
    artifact: LiveFuzzArtifactInput,
): Promise<void> {
    const absoluteDestination = resolve(destination);

    const parentDirectory = dirname(absoluteDestination);

    await ensureSecureDirectoryAsync(parentDirectory);

    if (!SAFE_ARTIFACT_FILENAME.test(basename(absoluteDestination))) {
        throw new Error("Live fuzz artifact filename is not safe.");
    }

    try {
        const existing = await lstat(absoluteDestination);

        if (existing.isSymbolicLink()) {
            throw new Error("Live fuzz artifact destination must not be a symlink.");
        }

        throw new Error("Live fuzz artifact destination already exists; refusing collision.");
    } catch (error) {
        if (!isNotFoundError(error)) {
            throw error;
        }
    }

    const temporary = `${absoluteDestination}.tmp-${randomBytes(8).toString("hex")}`;

    const contents = serializeLiveFuzzArtifact(artifact);

    let handle: Awaited<ReturnType<typeof open>> | undefined;

    try {
        handle = await open(temporary, "wx", 0o600);
        await handle.writeFile(contents, "utf8");
        await handle.sync();
        await handle.close();
        handle = undefined;
        await link(temporary, absoluteDestination);
        await unlink(temporary);
        await syncDirectoryAsync(parentDirectory);
    } finally {
        if (handle !== undefined) {
            await handle.close();
        }

        await unlinkIfExistsAsync(temporary);
    }
}

export async function loadLiveFuzzArtifactAsync(
    filename: string,
    identity: LiveFuzzReplayIdentity,
): Promise<LiveFuzzArtifactInput> {
    const parsed = JSON.parse(await readFile(filename, "utf8")) as unknown;

    if (!isLiveFuzzArtifact(parsed)) {
        throw new Error("Live fuzz artifact has an unknown or invalid schema.");
    } else if (
        parsed.fixtureFingerprint !== identity.fixtureFingerprint ||
        parsed.configFingerprint !== identity.configFingerprint
    ) {
        throw new Error("Live fuzz artifact fingerprint does not match this campaign.");
    } else if (
        parsed.runId !== identity.runId ||
        parsed.parties.issuer !== identity.parties.issuer ||
        parsed.parties.owner !== identity.parties.owner
    ) {
        throw new Error("Live fuzz artifact replay identity does not match this campaign.");
    }

    return parsed;
}

async function ensureSecureDirectoryAsync(directory: string): Promise<void> {
    const absoluteDirectory = resolve(directory);

    const root = parse(absoluteDirectory).root;

    const segments = relative(root, absoluteDirectory).split("/").filter(Boolean);

    let current = root;

    for (const segment of segments) {
        current = resolve(current, segment);

        try {
            const entry = await lstat(current);

            if (entry.isSymbolicLink()) {
                throw new Error(`Live fuzz artifact parent is a symlink: ${current}`);
            } else if (!entry.isDirectory()) {
                throw new Error(`Live fuzz artifact parent is not a directory: ${current}`);
            }
        } catch (error) {
            if (!isNotFoundError(error)) {
                throw error;
            }

            await mkdir(current, { mode: 0o700 });
        }
    }

    await chmod(absoluteDirectory, 0o700);
}

async function syncDirectoryAsync(directory: string): Promise<void> {
    const handle = await open(directory, "r");

    try {
        await handle.sync();
    } finally {
        await handle.close();
    }
}

async function unlinkIfExistsAsync(filename: string): Promise<void> {
    try {
        await unlink(filename);
    } catch (error) {
        if (!isNotFoundError(error)) {
            throw error;
        }
    }
}

function isLiveFuzzArtifact(value: unknown): value is LiveFuzzArtifactInput {
    if (typeof value !== "object" || value === null) {
        return false;
    }

    const artifact = value as Record<string, unknown>;

    return (
        artifact.schemaVersion === LIVE_FUZZ_ARTIFACT_SCHEMA_VERSION &&
        typeof artifact.fixtureFingerprint === "string" &&
        typeof artifact.configFingerprint === "string" &&
        typeof artifact.runId === "string" &&
        isParties(artifact.parties) &&
        (artifact.seed === undefined || typeof artifact.seed === "number") &&
        (artifact.path === undefined || typeof artifact.path === "string") &&
        (artifact.depthMode === "exact" || artifact.depthMode === "legacy-max") &&
        typeof artifact.depth === "number" &&
        isStringNumberRecord(artifact.actionWeights) &&
        Array.isArray(artifact.actors) &&
        artifact.actors.every((actor) => typeof actor === "string") &&
        typeof artifact.campaignNonce === "string" &&
        (artifact.amountSuffix === undefined || typeof artifact.amountSuffix === "number") &&
        typeof artifact.payloadMarker === "string" &&
        Array.isArray(artifact.actions) &&
        Array.isArray(artifact.invariantFailures) &&
        isStringRecord(artifact.ledgerEnds) &&
        typeof artifact.numRuns === "number" &&
        typeof artifact.numShrinks === "number" &&
        (artifact.counterexamplePath === undefined ||
            typeof artifact.counterexamplePath === "string")
    );
}

function sortJsonValue(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map(sortJsonValue);
    } else if (typeof value === "bigint") {
        return value.toString();
    } else if (typeof value === "object" && value !== null) {
        return Object.fromEntries(
            Object.entries(value)
                .sort(([left], [right]) => left.localeCompare(right))
                .map(([key, entry]) => [key, sortJsonValue(entry)]),
        );
    }

    return value;
}

function isParties(value: unknown): value is { issuer: string; owner: string } {
    return (
        isStringRecord(value) &&
        typeof value.issuer === "string" &&
        typeof value.owner === "string"
    );
}

function isStringRecord(value: unknown): value is Record<string, string> {
    return (
        typeof value === "object" &&
        value !== null &&
        Object.values(value).every((entry) => typeof entry === "string")
    );
}

function isStringNumberRecord(
    value: unknown,
): value is Record<string, number> {
    return (
        typeof value === "object" &&
        value !== null &&
        Object.values(value).every((entry) => typeof entry === "number")
    );
}

function isNotFoundError(error: unknown): boolean {
    return (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "ENOENT"
    );
}
