import { randomBytes } from "node:crypto";
import type { Parameters } from "fast-check";
import { propertyParameters } from "../../property/property-test-options.js";

const DEFAULT_DEPTH = 8;

const DEFAULT_POLL_TIMEOUT_MS = 10_000;

const DEFAULT_POLL_INTERVAL_MS = 100;

const DEFAULT_TEST_TIMEOUT_MS = 300_000;

const DEFAULT_CLEANUP_TIMEOUT_MS = 5_000;

export const DEFAULT_LIVE_FUZZ_FAILURE_DIR = "tests/live/.artifacts/failures";

export const LIVE_FUZZ_ACTIONS = [
    "query",
    "fetch",
    "events",
    "exercise",
    "probe",
] as const;

export type LiveFuzzAction = (typeof LIVE_FUZZ_ACTIONS)[number];

export type LiveFuzzActor = "issuer" | "owner";

export type LiveFuzzActionWeights = Readonly<
    Record<LiveFuzzAction, number>
>;

const DEFAULT_ACTION_WEIGHTS: LiveFuzzActionWeights = {
    query: 30,
    fetch: 20,
    events: 20,
    exercise: 10,
    probe: 20,
};

export interface LiveFuzzConfig extends Parameters {
    readonly enabled: boolean;
    readonly depthMode: "exact" | "legacy-max";
    readonly depth: number;
    /** Compatibility alias retained while legacy runners are migrated. */
    readonly maxCommands: number;
    readonly pollTimeoutMs: number;
    readonly pollIntervalMs: number;
    readonly testTimeoutMs: number;
    readonly cleanupTimeoutMs: number;
    readonly requireArchive: boolean;
    readonly failOnRevert: boolean;
    readonly actionWeights: LiveFuzzActionWeights;
    readonly actors: readonly LiveFuzzActor[];
    readonly failureDir: string;
    readonly replayFile?: string;
    readonly replayFailures: boolean;
    readonly runId: string;
    readonly issuerParty?: string;
    readonly ownerParty?: string;
}

let invocationRunId: string | undefined;

export function readLiveFuzzConfig(): LiveFuzzConfig {
    const actors = parseActors(process.env.FUZZ_LIVE_ACTORS);

    const issuerParty = process.env.FUZZ_LIVE_ISSUER_PARTY;

    const ownerParty = process.env.FUZZ_LIVE_OWNER_PARTY;

    validateParties(actors, issuerParty, ownerParty);

    const { depthMode, depth } = parseDepth();

    const requireArchive = parseBoolean(
        "FUZZ_LIVE_REQUIRE_ARCHIVE",
        process.env.FUZZ_LIVE_REQUIRE_ARCHIVE,
    );

    const failOnRevert = parseStrictBoolean(
        "FUZZ_LIVE_FAIL_ON_REVERT",
        process.env.FUZZ_LIVE_FAIL_ON_REVERT,
    );

    if (requireArchive && !failOnRevert) {
        throw new Error(
            "FUZZ_LIVE_REQUIRE_ARCHIVE requires FUZZ_LIVE_FAIL_ON_REVERT=true.",
        );
    }

    const actionWeights = parseActionWeights(
        process.env.FUZZ_LIVE_ACTION_WEIGHTS,
        depthMode,
        depth,
    );

    const failureDir =
        process.env.FUZZ_LIVE_FAILURE_DIR ?? DEFAULT_LIVE_FUZZ_FAILURE_DIR;

    return {
        enabled: process.env.SDK_TEST_ENABLE_LIVE_FUZZING === "1",
        ...propertyParameters({ defaultNumRuns: 20 }),
        depthMode,
        depth,
        maxCommands: depth,
        pollTimeoutMs: parsePositiveInteger(
            "FUZZ_LIVE_POLL_TIMEOUT_MS",
            process.env.FUZZ_LIVE_POLL_TIMEOUT_MS,
            DEFAULT_POLL_TIMEOUT_MS,
        ),
        pollIntervalMs: parsePositiveInteger(
            "FUZZ_LIVE_POLL_INTERVAL_MS",
            process.env.FUZZ_LIVE_POLL_INTERVAL_MS,
            DEFAULT_POLL_INTERVAL_MS,
        ),
        testTimeoutMs: parsePositiveInteger(
            "FUZZ_LIVE_TEST_TIMEOUT_MS",
            process.env.FUZZ_LIVE_TEST_TIMEOUT_MS,
            DEFAULT_TEST_TIMEOUT_MS,
        ),
        cleanupTimeoutMs: parsePositiveInteger(
            "FUZZ_LIVE_CLEANUP_TIMEOUT_MS",
            process.env.FUZZ_LIVE_CLEANUP_TIMEOUT_MS,
            DEFAULT_CLEANUP_TIMEOUT_MS,
        ),
        requireArchive,
        failOnRevert,
        actionWeights,
        actors,
        failureDir,
        replayFile: process.env.FUZZ_LIVE_REPLAY_FILE,
        replayFailures: parseStrictBoolean(
            "FUZZ_LIVE_REPLAY_FAILURES",
            process.env.FUZZ_LIVE_REPLAY_FAILURES,
            true,
        ),
        runId: getRunId(),
        issuerParty,
        ownerParty,
    };
}

function parseDepth(): {
    depthMode: "exact" | "legacy-max";
    depth: number;
} {
    const depthValue = process.env.FUZZ_LIVE_DEPTH;

    const maxCommandsValue = process.env.FUZZ_LIVE_MAX_COMMANDS;

    const depth =
        depthValue === undefined
            ? undefined
            : parsePositiveInteger("FUZZ_LIVE_DEPTH", depthValue, DEFAULT_DEPTH);

    const maxCommands =
        maxCommandsValue === undefined
            ? undefined
            : parsePositiveInteger(
                "FUZZ_LIVE_MAX_COMMANDS",
                maxCommandsValue,
                DEFAULT_DEPTH,
            );

    if (depth !== undefined && maxCommands !== undefined && depth !== maxCommands) {
        throw new Error(
            "FUZZ_LIVE_DEPTH and FUZZ_LIVE_MAX_COMMANDS conflict; use equal values or only one setting.",
        );
    }

    let depthMode: "exact" | "legacy-max";

    let resolvedDepth: number;

    if (depth !== undefined) {
        depthMode = "exact";
        resolvedDepth = depth;
    } else if (maxCommands !== undefined) {
        depthMode = "legacy-max";
        resolvedDepth = maxCommands;
    } else {
        depthMode = "exact";
        resolvedDepth = DEFAULT_DEPTH;
    }

    return { depthMode, depth: resolvedDepth };
}

function parseActors(value: string | undefined): readonly LiveFuzzActor[] {
    if (value === undefined) {
        return ["issuer", "owner"];
    }

    const names = value.split(",").map((name) => name.trim());

    if (names.some((name) => name.length === 0)) {
        throw new Error("FUZZ_LIVE_ACTORS must not contain empty entries.");
    }

    const actors = [...new Set(names)];

    if (
        actors.some((actor) => actor !== "issuer" && actor !== "owner") ||
        actors.length !== names.length
    ) {
        throw new Error(
            "FUZZ_LIVE_ACTORS must contain unique issuer and/or owner actors.",
        );
    }

    else if (!actors.includes("issuer")) {
        throw new Error("FUZZ_LIVE_ACTORS must include issuer.");
    }

    return actors as LiveFuzzActor[];
}

function validateParties(
    actors: readonly LiveFuzzActor[],
    issuerParty: string | undefined,
    ownerParty: string | undefined,
): void {
    if (actors.includes("owner") && (issuerParty === undefined) !== (ownerParty === undefined)) {
        throw new Error(
            "FUZZ_LIVE_ISSUER_PARTY and FUZZ_LIVE_OWNER_PARTY must be supplied together when owner actor reads are enabled.",
        );
    }

    else if (actors.includes("owner") && ownerParty !== undefined && issuerParty === undefined) {
        throw new Error("issuer party is required when owner actor reads are enabled.");
    }
}

function parseActionWeights(
    value: string | undefined,
    depthMode: "exact" | "legacy-max",
    depth: number,
): LiveFuzzActionWeights {
    const weights = { ...DEFAULT_ACTION_WEIGHTS };

    if (value !== undefined) {
        const entries = value.split(",");

        if (entries.some((entry) => entry.trim().length === 0)) {
            throw new Error(
                "FUZZ_LIVE_ACTION_WEIGHTS must not contain empty entries.",
            );
        }

        const seen = new Set<string>();

        for (const entry of entries) {
            const [rawName, rawWeight, ...extra] = entry.split("=");

            const name = rawName?.trim();

            const weight = rawWeight?.trim();

            if (
                extra.length > 0 ||
                name === undefined ||
                weight === undefined ||
                !LIVE_FUZZ_ACTIONS.includes(name as LiveFuzzAction) ||
                seen.has(name) ||
                !/^\d+$/.test(weight)
            ) {
                throw new Error(
                    "FUZZ_LIVE_ACTION_WEIGHTS must contain unique action=non-negative-integer entries.",
                );
            }

            const parsedWeight = Number(weight);

            if (!Number.isSafeInteger(parsedWeight)) {
                throw new Error(
                    "FUZZ_LIVE_ACTION_WEIGHTS values must be safe integers.",
                );
            }

            seen.add(name);
            weights[name as LiveFuzzAction] = parsedWeight;
        }
    }

    if (
        depthMode === "exact" &&
        depth > 1 &&
        (weights.probe <= 0 ||
            weights.query + weights.fetch + weights.events <= 0)
    ) {
        throw new Error(
            "FUZZ_LIVE_ACTION_WEIGHTS must leave probe and a post-archive read action reachable in exact-depth mode.",
        );
    }

    return weights;
}

function getRunId(): string {
    if (process.env.FUZZ_LIVE_RUN_ID !== undefined) {
        return process.env.FUZZ_LIVE_RUN_ID;
    }

    invocationRunId ??= `live-fuzz-${Date.now().toString(36)}-${randomBytes(4).toString("hex")}`;

    return invocationRunId;
}

function parsePositiveInteger(
    key: string,
    value: string | undefined,
    fallback: number,
): number {
    if (value === undefined) {
        return fallback;
    } else if (!/^[1-9]\d*$/.test(value)) {
        throw new Error(`${key} must be a positive safe integer.`);
    }

    const parsed = Number(value);

    if (!Number.isSafeInteger(parsed)) {
        throw new Error(`${key} must be a positive safe integer.`);
    }

    return parsed;
}

function parseBoolean(key: string, value: string | undefined): boolean {
    if (value === undefined) {
        return false;
    } else if (value === "1" || value === "true") {
        return true;
    } else if (value === "0" || value === "false") {
        return false;
    }

    throw new Error(`${key} must be true, false, 1, or 0.`);
}

function parseStrictBoolean(
    key: string,
    value: string | undefined,
    fallback = false,
): boolean {
    if (value === undefined) {
        return fallback;
    } else if (value === "true") {
        return true;
    } else if (value === "false") {
        return false;
    }

    throw new Error(`${key} must be exactly true or false.`);
}
