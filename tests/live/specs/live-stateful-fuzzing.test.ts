import * as fc from "fast-check";
import { afterAll, describe, expect, it } from "vitest";
import {
    createLiveFuzzFixtureAsync,
} from "../fuzz/live-fuzz-fixture.js";
import {
    liveFuzzCommandSequenceArbitrary,
} from "../fuzz/live-fuzz-commands.js";
import { readLiveFuzzConfig } from "../fuzz/live-fuzz-config.js";
import { runLiveFuzzSequenceAsync } from "../fuzz/live-fuzz-runner.js";
import {
    disposeLiveMultiNodeClientsAsync,
} from "../runtime/live-multi-node-client-factory.js";

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
            fixture = await createLiveFuzzFixtureAsync(config);

            console.info(
                `Live fuzz campaign: runId=${config.runId}, numRuns=${config.numRuns}, seed=${config.seed ?? "generated"}, path=${config.path ?? "<none>"}`,
            );

            const commandArbitrary = liveFuzzCommandSequenceArbitrary({
                maxCommands: config.maxCommands,
                requireArchive: config.requireArchive,
            });

            const propertyOptions = {
                numRuns: config.numRuns,
                ...(config.seed === undefined ? {} : { seed: config.seed }),
                ...(config.path === undefined ? {} : { path: config.path }),
                interruptAfterTimeLimit: config.testTimeoutMs,
            };

            await fc.assert(
                fc.asyncProperty(
                    commandArbitrary,
                    fixture.createPayloadArbitrary,
                    async (commands, amountSuffix) => {
                        await runLiveFuzzSequenceAsync({
                            fixture,
                            config,
                            commands,
                            amountSuffix,
                        });
                    },
                ),
                propertyOptions,
            );

            expect(fixture.clients.all).toHaveLength(2);
        },
        config.testTimeoutMs,
    );
});
