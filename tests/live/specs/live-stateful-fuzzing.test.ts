import * as fc from "fast-check";
import { afterAll, describe, expect, it } from "vitest";
import {
    createLiveFuzzFixtureAsync,
} from "../fuzz/live-fuzz-fixture.js";
import {
    liveFuzzCommandSequenceArbitrary,
} from "../fuzz/live-fuzz-commands.js";
import {
    liveFuzzExactInputArbitrary,
    LiveFuzzExactInput,
} from "../fuzz/live-fuzz-campaign.js";
import {
    createLiveFuzzFingerprint,
    listLiveFuzzArtifactPathsAsync,
    loadLiveFuzzArtifactAsync,
    liveFuzzInputKey,
    safeLiveFuzzArtifactFilename,
    selectLiveFuzzCounterexampleTrace,
    writeLiveFuzzArtifactAsync,
} from "../fuzz/live-fuzz-artifacts.js";
import { LiveFuzzConfig, readLiveFuzzConfig } from "../fuzz/live-fuzz-config.js";
import { runLiveFuzzSequenceAsync } from "../fuzz/live-fuzz-runner.js";
import {
    disposeLiveMultiNodeClientsAsync,
} from "../runtime/live-multi-node-client-factory.js";

const FIXTURE_VERSION = "main-iou-v1";

const ROUTE_MATRIX_VERSION = "v1";

describe("live stateful fuzzing", () => {
    const config = readLiveFuzzConfig();

    let fixture: Awaited<ReturnType<typeof createLiveFuzzFixtureAsync>> | undefined;

    afterAll(async () => {
        await disposeLiveMultiNodeClientsAsync(fixture?.clients);
    });

    it.skipIf(config.enabled)(
        "is disabled (set SDK_TEST_ENABLE_LIVE_FUZZING=1 to enable)",
        () => {
            expect(config.enabled).toBe(false);
        },
    );

    it.runIf(config.enabled)(
        "executes valid Main:Iou stateful sequences against two participants",
        async () => {
            const replayInputs = await loadReplayInputsAsync(config);

            fixture = await createLiveFuzzFixtureAsync(config);

            console.info(
                `Live fuzz campaign: runId=${config.runId}, numRuns=${config.numRuns}, seed=${config.seed ?? "generated"}, path=${config.path ?? "<none>"}`,
            );

            for (const input of replayInputs) {
                await runLiveFuzzInputAsync(fixture, config, input);
            }

            const inputArbitrary = createLiveFuzzInputArbitrary(fixture, config);

            const traces = new Map<string, LiveFuzzTrace>();

            const details = await fc.check(
                fc.asyncProperty(inputArbitrary, async (input) => {
                    const trace = createLiveFuzzTrace(input);

                    const key = liveFuzzInputKey(input);

                    if (traces.has(key)) {
                        throw new Error("Duplicate complete live fuzz input in one invocation.");
                    }

                    traces.set(key, trace);
                    await runLiveFuzzInputAsync(fixture, config, input, trace);
                }),
                {
                    numRuns: config.numRuns,
                    ...(config.seed === undefined ? {} : { seed: config.seed }),
                    ...(config.path === undefined ? {} : { path: config.path }),
                    interruptAfterTimeLimit: config.testTimeoutMs,
                },
            );

            if (details.failed) {
                const trace = selectLiveFuzzCounterexampleTrace(details, traces);

                try {
                    await writeLiveFuzzFailureArtifactAsync(
                        fixture,
                        config,
                        details,
                        trace,
                    );
                } catch (artifactError) {
                    const message = artifactError instanceof Error
                        ? artifactError.message
                        : String(artifactError);

                    console.error(`Live fuzz artifact write failed: ${message}`);
                }

                throwFailure(details.errorInstance);
            }

            expect(fixture.clients.all).toHaveLength(2);
        },
        config.testTimeoutMs,
    );
});

interface LiveFuzzTrace {
    readonly input: LiveFuzzExactInput;
    readonly outcomes: Readonly<Record<string, unknown>>[];
}

function createLiveFuzzTrace(input: LiveFuzzExactInput): LiveFuzzTrace {
    return {
        input,
        outcomes: input.commands.map((command) => ({
            kind: command.kind,
            ...("participant" in command ? { participant: command.participant } : {}),
            outcome: "not-attempted",
        })),
    };
}

async function runLiveFuzzInputAsync(
    fixture: Awaited<ReturnType<typeof createLiveFuzzFixtureAsync>>,
    config: LiveFuzzConfig,
    input: LiveFuzzExactInput,
    trace?: LiveFuzzTrace,
): Promise<void> {
    let outcomeIndex = 0;

    await runLiveFuzzSequenceAsync({
        fixture,
        config,
        commands: input.commands,
        amountSuffix: input.amountSuffix,
        campaignNonce: input.campaignNonce,
        recordOutcome: trace === undefined
            ? undefined
            : (_command, outcome) => {
                trace.outcomes[outcomeIndex] = {
                    ...trace.outcomes[outcomeIndex],
                    outcome: outcome.kind,
                    ...( "statusCode" in outcome && outcome.statusCode !== undefined
                        ? { statusCode: outcome.statusCode }
                        : {}),
                };
                outcomeIndex += 1;
            },
    });
}

function createLiveFuzzInputArbitrary(
    fixture: Awaited<ReturnType<typeof createLiveFuzzFixtureAsync>>,
    config: LiveFuzzConfig,
): fc.Arbitrary<LiveFuzzExactInput> {
    if (config.depthMode === "exact") {
        return liveFuzzExactInputArbitrary({
            depth: config.depth,
            actionWeights: config.actionWeights,
            actors: config.actors,
            requireArchive: config.requireArchive,
        });
    }

    return fc
        .tuple(
            liveFuzzCommandSequenceArbitrary({
                maxCommands: config.maxCommands,
                requireArchive: config.requireArchive,
            }),
            fixture.createPayloadArbitrary,
            fc.bigInt({ min: 0n, max: (2n ** 128n) - 1n }),
        )
        .map(([commands, amountSuffix, campaignNonce]) => ({
            commands,
            amountSuffix,
            campaignNonce,
        }));
}

async function loadReplayInputsAsync(
    config: LiveFuzzConfig,
): Promise<readonly LiveFuzzExactInput[]> {
    if (config.replayFile !== undefined) {
        const identity = createReplayIdentity(config);

        const artifact = await loadLiveFuzzArtifactAsync(config.replayFile, identity);

        return [artifactToInput(artifact)];
    } else if (!config.replayFailures || config.issuerParty === undefined || config.ownerParty === undefined) {
        return [];
    }

    let filenames: readonly string[];

    try {
        filenames = await listLiveFuzzArtifactPathsAsync(config.failureDir);
    } catch (error) {
        if (isNotFoundError(error)) {
            return [];
        }

        throw error;
    }

    const identity = createReplayIdentity(config);

    const inputs: LiveFuzzExactInput[] = [];

    for (const filename of filenames) {
        try {
            inputs.push(artifactToInput(await loadLiveFuzzArtifactAsync(filename, identity)));
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);

            console.error(`Ignoring stale or corrupt live fuzz artifact ${filename}: ${message}`);
        }
    }

    return inputs;
}

function artifactToInput(artifact: {
    readonly actions: readonly Readonly<Record<string, unknown>>[];
    readonly amountSuffix?: number;
    readonly campaignNonce: string;
}): LiveFuzzExactInput {
    if (artifact.amountSuffix === undefined) {
        throw new Error("Live fuzz replay artifact has no exact amount suffix.");
    }

    return {
        commands: artifact.actions.map((action) => {
            const kind = action.kind;

            if (kind === "create") {
                return { kind: "create" };
            } else if (
                (kind === "query" || kind === "fetch" || kind === "events" ||
                    kind === "exercise" || kind === "probe") &&
                (action.participant === "issuer" || action.participant === "owner")
            ) {
                return { kind, participant: action.participant } as LiveFuzzExactInput["commands"][number];
            }

            throw new Error("Live fuzz replay artifact contains an invalid action.");
        }),
        amountSuffix: artifact.amountSuffix,
        campaignNonce: BigInt(artifact.campaignNonce),
    };
}

async function writeLiveFuzzFailureArtifactAsync(
    fixture: Awaited<ReturnType<typeof createLiveFuzzFixtureAsync>>,
    config: LiveFuzzConfig,
    details: {
        readonly seed: number;
        readonly numRuns: number;
        readonly numShrinks: number;
        readonly counterexamplePath: string;
    },
    trace: LiveFuzzTrace,
): Promise<void> {
    const fingerprints = createFingerprints(config);

    const destination = `${config.failureDir}/${safeLiveFuzzArtifactFilename(
        config.runId,
        trace.input.campaignNonce.toString(),
    )}`;

    await writeLiveFuzzArtifactAsync(destination, {
        schemaVersion: 1,
        fixtureFingerprint: fingerprints.fixtureFingerprint,
        configFingerprint: fingerprints.configFingerprint,
        runId: config.runId,
        parties: {
            issuer: fixture.issuerParty,
            owner: fixture.ownerParty,
        },
        seed: details.seed,
        path: details.counterexamplePath,
        depthMode: config.depthMode,
        depth: config.depth,
        actionWeights: config.actionWeights,
        actors: config.actors,
        campaignNonce: trace.input.campaignNonce.toString(),
        amountSuffix: trace.input.amountSuffix,
        payloadMarker: `${config.runId}:${trace.input.campaignNonce.toString()}:${trace.input.amountSuffix}`,
        actions: trace.outcomes,
        ledgerEnds: {},
        invariantFailures: [],
        numRuns: details.numRuns,
        numShrinks: details.numShrinks,
        counterexamplePath: details.counterexamplePath,
    });
}

function createReplayIdentity(config: LiveFuzzConfig) {
    if (config.issuerParty === undefined || config.ownerParty === undefined) {
        throw new Error(
            "Live fuzz replay requires FUZZ_LIVE_ISSUER_PARTY and FUZZ_LIVE_OWNER_PARTY.",
        );
    }

    const fingerprints = createFingerprints(config);

    return {
        fixtureFingerprint: fingerprints.fixtureFingerprint,
        configFingerprint: fingerprints.configFingerprint,
        runId: config.runId,
        parties: {
            issuer: config.issuerParty,
            owner: config.ownerParty,
        },
    };
}

function createFingerprints(config: LiveFuzzConfig): {
    fixtureFingerprint: string;
    configFingerprint: string;
} {
    const base = {
        schemaVersion: 1,
        fixtureVersion: FIXTURE_VERSION,
        templateId: "Main:Iou",
        actors: config.actors,
        routeMatrixVersion: ROUTE_MATRIX_VERSION,
        depthMode: config.depthMode,
        depth: config.depth,
        actionWeights: config.actionWeights,
    } as const;

    return {
        fixtureFingerprint: createLiveFuzzFingerprint({
            ...base,
            revertPolicy: "permissive",
        }),
        configFingerprint: createLiveFuzzFingerprint({
            ...base,
            revertPolicy: config.failOnRevert ? "strict" : "permissive",
        }),
    };
}

function throwFailure(error: unknown): never {
    if (error instanceof Error) {
        throw error;
    }

    throw new Error(String(error));
}

function isNotFoundError(error: unknown): boolean {
    return (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "ENOENT"
    );
}
