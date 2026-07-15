import { afterAll, describe, expect, it } from "vitest";
import {
    CampaignMetricOutcome,
    runInvariantCampaignCheckAsync,
} from "../../../src/testing/index.js";
import {
    createLiveFuzzFixtureAsync,
} from "../fuzz/live-fuzz-fixture.js";
import {
    LiveFuzzExactInput,
} from "../fuzz/live-fuzz-campaign.js";
import {
    createLiveFuzzFingerprint,
    listLiveFuzzArtifactPathsAsync,
    loadLiveFuzzArtifactAsync,
    liveFuzzInputKey,
    safeLiveFuzzArtifactFilename,
    writeLiveFuzzArtifactAsync,
} from "../fuzz/live-fuzz-artifacts.js";
import { LiveFuzzConfig, readLiveFuzzConfig } from "../fuzz/live-fuzz-config.js";
import {
    assertLiveFuzzRunInvariantsAsync,
    cleanupLiveFuzzRunAsync,
    createLiveFuzzRunContext,
    executeLiveFuzzCommandAsync,
    runLiveFuzzSequenceAsync,
} from "../fuzz/live-fuzz-runner.js";
import {
    createPublicLiveFuzzActionArbitrary,
    createPublicLiveFuzzCampaign,
    PublicLiveFuzzAction,
} from "../fuzz/public-live-fuzz-campaign.js";
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

            const campaign = createPublicLiveFuzzCampaign({
                ...config,
                issuerParty: fixture.issuerParty,
                ownerParty: fixture.ownerParty,
            });

            const result = await runInvariantCampaignCheckAsync({
                campaign,
                arbitrary: createPublicLiveFuzzActionArbitrary(config),
                key: publicLiveFuzzActionKey,
                setupAsync: async (actions) => ({
                    ...createLiveFuzzRunContext({
                        fixture,
                        config,
                        ...publicLiveFuzzInputFromActions(actions),
                    }),
                    ghost: {},
                }),
                executeAsync: async (context, action) =>
                    toCampaignMetricOutcome(
                        await executeLiveFuzzCommandAsync({
                            context,
                            command: action.command,
                        }),
                        action,
                    ),
                checkInvariantsAsync: async (context, phase) => {
                    if (phase.kind === "before-run") {
                        return [];
                    }

                    try {
                        await assertLiveFuzzRunInvariantsAsync(
                            context,
                            phase.kind === "after-action"
                                ? "after-action"
                                : phase.kind === "after-run"
                                    ? "end-of-campaign"
                                    : "post-cleanup",
                        );

                        return [];
                    } catch (error) {
                        return [{
                            invariant: "Main:Iou lifecycle",
                            code: "live-invariant-failure",
                            message: error instanceof Error ? error.message : String(error),
                        }];
                    }
                },
                cleanupAsync: cleanupLiveFuzzRunAsync,
            });

            const details = result.details;

            if (details.failed) {
                const counterexample = result.counterexampleTrace;

                if (counterexample === undefined) {
                    throw new Error("Public campaign runner did not retain the counterexample trace.");
                }

                const trace = createLiveFuzzTrace(
                    publicLiveFuzzInputFromActions(
                        counterexample.actions.map(({ action }) => action),
                    ),
                );

                for (const [index, { action, outcome }] of counterexample.actions.entries()) {
                    trace.outcomes[index] = {
                        ...trace.outcomes[index],
                        outcome: outcome.kind,
                        ...("reason" in outcome ? { reason: outcome.reason } : {}),
                    };
                }

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
    readonly error?: unknown;
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

function publicLiveFuzzInputFromActions(
    actions: readonly PublicLiveFuzzAction[],
): LiveFuzzExactInput {
    const first = actions[0];

    if (first === undefined) {
        throw new Error("Public live fuzz candidates require at least one action.");
    }

    else if (actions.some((action) =>
        action.amountSuffix !== first.amountSuffix
        || action.campaignNonce !== first.campaignNonce
    )) {
        throw new Error("Public live fuzz candidates must retain one amount and nonce.");
    }

    return {
        commands: actions.map(({ command }) => command),
        amountSuffix: first.amountSuffix,
        campaignNonce: first.campaignNonce,
    };
}

function publicLiveFuzzActionKey(
    actions: readonly PublicLiveFuzzAction[],
): string {
    return liveFuzzInputKey(publicLiveFuzzInputFromActions(actions));
}

function toCampaignMetricOutcome(
    outcome: Awaited<ReturnType<typeof executeLiveFuzzCommandAsync>>,
    action: PublicLiveFuzzAction,
): CampaignMetricOutcome {
    if (outcome.kind === "accepted") {
        return {
            kind: "accepted",
            updateId: `live-fuzz:${action.campaignNonce.toString()}:${action.targetKey}`,
        };
    }

    return {
        kind: outcome.kind,
        reason: outcome.details,
    };
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
