import { afterEach, describe, expect, it } from "vitest";
import * as fc from "fast-check";
import { propertyParameters } from "../../property/property-test-options.js";
import { readLiveFuzzConfig } from "../../live/fuzz/live-fuzz-config.js";
import {
    LIVE_IOU_TEMPLATE_ID,
    buildArchiveRequest,
    buildCreateRequest,
    createAmountArbitrary,
    createRunAmount,
} from "../../live/fuzz/live-fuzz-fixture.js";
import {
    applyLiveFuzzModelCommand,
    createInitialLiveFuzzModel,
    liveFuzzCommandSequenceArbitrary,
    markLiveFuzzContractCreated,
} from "../../live/fuzz/live-fuzz-commands.js";
import {
    compareLedgerOffsets,
    formatPollingTimeout,
    matchesLiveFuzzContract,
    summarizeLiveFuzzContract,
} from "../../live/fuzz/live-fuzz-runner.js";
import {
    applyLiveFuzzCommandOutcome,
    classifyLiveFuzzCommandOutcome,
    liveFuzzExactInputArbitrary,
    liveFuzzEligibleActions,
} from "../../live/fuzz/live-fuzz-campaign.js";

const environmentKeys = [
    "SDK_TEST_ENABLE_LIVE_FUZZING",
    "FUZZ_NUM_RUNS",
    "FUZZ_SEED",
    "FUZZ_PATH",
    "FUZZ_LIVE_DEPTH",
    "FUZZ_LIVE_MAX_COMMANDS",
    "FUZZ_LIVE_FAIL_ON_REVERT",
    "FUZZ_LIVE_ACTION_WEIGHTS",
    "FUZZ_LIVE_ACTORS",
    "FUZZ_LIVE_FAILURE_DIR",
    "FUZZ_LIVE_REPLAY_FILE",
    "FUZZ_LIVE_REPLAY_FAILURES",
    "FUZZ_LIVE_POLL_TIMEOUT_MS",
    "FUZZ_LIVE_POLL_INTERVAL_MS",
    "FUZZ_LIVE_TEST_TIMEOUT_MS",
    "FUZZ_LIVE_CLEANUP_TIMEOUT_MS",
    "FUZZ_LIVE_REQUIRE_ARCHIVE",
    "FUZZ_LIVE_RUN_ID",
    "FUZZ_LIVE_ISSUER_PARTY",
    "FUZZ_LIVE_OWNER_PARTY",
] as const;

const originalEnvironment = new Map(
    environmentKeys.map((key) => [key, process.env[key]]),
);

afterEach(() => {
    for (const key of environmentKeys) {
        const value = originalEnvironment.get(key);

        if (value === undefined) {
            delete process.env[key];
        } else {
            process.env[key] = value;
        }
    }
});

describe("live fuzz configuration", () => {
    it("is disabled unless explicitly enabled", () => {
        delete process.env.SDK_TEST_ENABLE_LIVE_FUZZING;

        expect(readLiveFuzzConfig().enabled).toBe(false);
    });

    it("uses live defaults without changing offline property defaults", () => {
        delete process.env.FUZZ_NUM_RUNS;
        delete process.env.FUZZ_SEED;
        delete process.env.FUZZ_PATH;

        expect(readLiveFuzzConfig()).toMatchObject({
            numRuns: 20,
            depthMode: "exact",
            depth: 8,
            maxCommands: 8,
            failOnRevert: false,
            actors: ["issuer", "owner"],
            actionWeights: {
                query: 30,
                fetch: 20,
                events: 20,
                exercise: 10,
                probe: 20,
            },
            pollTimeoutMs: 10_000,
            pollIntervalMs: 100,
            testTimeoutMs: 300_000,
            cleanupTimeoutMs: 5_000,
        });
        expect(propertyParameters()).toEqual({ numRuns: 100 });
    });

    it("accepts reproducibility, party, and smoke options", () => {
        process.env.SDK_TEST_ENABLE_LIVE_FUZZING = "1";
        process.env.FUZZ_NUM_RUNS = "7";
        process.env.FUZZ_SEED = "123";
        process.env.FUZZ_PATH = "0:1";
        process.env.FUZZ_LIVE_REQUIRE_ARCHIVE = "1";
        process.env.FUZZ_LIVE_FAIL_ON_REVERT = "true";
        process.env.FUZZ_LIVE_REPLAY_FAILURES = "false";
        process.env.FUZZ_LIVE_FAILURE_DIR = "artifacts";
        process.env.FUZZ_LIVE_REPLAY_FILE = "failure.json";
        process.env.FUZZ_LIVE_RUN_ID = "replay-run";
        process.env.FUZZ_LIVE_ISSUER_PARTY = "issuer::abc";
        process.env.FUZZ_LIVE_OWNER_PARTY = "owner::def";

        expect(readLiveFuzzConfig()).toMatchObject({
            enabled: true,
            numRuns: 7,
            seed: 123,
            path: "0:1",
            requireArchive: true,
            failOnRevert: true,
            replayFailures: false,
            failureDir: "artifacts",
            replayFile: "failure.json",
            runId: "replay-run",
            issuerParty: "issuer::abc",
            ownerParty: "owner::def",
        });
    });

    it("uses exact depth unless only the legacy maximum is supplied", () => {
        process.env.FUZZ_LIVE_DEPTH = "5";

        expect(readLiveFuzzConfig()).toMatchObject({
            depthMode: "exact",
            depth: 5,
            maxCommands: 5,
        });

        delete process.env.FUZZ_LIVE_DEPTH;
        process.env.FUZZ_LIVE_MAX_COMMANDS = "6";

        expect(readLiveFuzzConfig()).toMatchObject({
            depthMode: "legacy-max",
            depth: 6,
            maxCommands: 6,
        });
    });

    it("accepts equal depth and legacy maximum but rejects conflicts", () => {
        process.env.FUZZ_LIVE_DEPTH = "6";
        process.env.FUZZ_LIVE_MAX_COMMANDS = "6";

        expect(readLiveFuzzConfig().depthMode).toBe("exact");

        process.env.FUZZ_LIVE_MAX_COMMANDS = "7";

        expect(() => readLiveFuzzConfig()).toThrow(/conflict/);
    });

    it.each(["1", "0", "TRUE", "False"]) (
        "rejects non-lowercase fail-on-revert value %s",
        (value) => {
            process.env.FUZZ_LIVE_FAIL_ON_REVERT = value;

            expect(() => readLiveFuzzConfig()).toThrow(/FUZZ_LIVE_FAIL_ON_REVERT/);
        },
    );

    it("parses weighted actions and rejects malformed entries", () => {
        process.env.FUZZ_LIVE_ACTION_WEIGHTS = " query=3, probe=7 ";

        expect(readLiveFuzzConfig().actionWeights).toMatchObject({
            query: 3,
            probe: 7,
        });

        for (const value of [
            "query=1,query=2",
            "unknown=1",
            "query=",
            "query=-1",
            "query=1,,probe=1",
        ]) {
            process.env.FUZZ_LIVE_ACTION_WEIGHTS = value;

            expect(() => readLiveFuzzConfig()).toThrow(/FUZZ_LIVE_ACTION_WEIGHTS/);
        }
    });

    it("supports issuer-only actor campaigns without owner-targeted reads", () => {
        process.env.FUZZ_LIVE_ISSUER_PARTY = "issuer::abc";
        process.env.FUZZ_LIVE_ACTORS = "issuer";

        expect(readLiveFuzzConfig()).toMatchObject({
            actors: ["issuer"],
            issuerParty: "issuer::abc",
        });
    });

    it("requires an issuer actor and owner party when owner reads are enabled", () => {
        process.env.FUZZ_LIVE_ACTORS = "owner";

        expect(() => readLiveFuzzConfig()).toThrow(/issuer/);

        process.env.FUZZ_LIVE_ACTORS = "issuer,owner";
        process.env.FUZZ_LIVE_ISSUER_PARTY = "issuer::abc";

        expect(() => readLiveFuzzConfig()).toThrow(/together/);
    });

    it.each([
        "0",
        "-1",
        "1.5",
        "not-a-number",
        "9007199254740992",
    ])("rejects unsafe live limit %s", (value) => {
        process.env.FUZZ_LIVE_MAX_COMMANDS = value;

        expect(() => readLiveFuzzConfig()).toThrow(/FUZZ_LIVE_MAX_COMMANDS/);
    });

    it("requires both supplied party IDs", () => {
        process.env.FUZZ_LIVE_ISSUER_PARTY = "issuer::abc";

        expect(() => readLiveFuzzConfig()).toThrow(/together/);
    });

    it("builds a deterministic valid Main:Iou create request", () => {
        const first = buildCreateRequest({
            runId: "replay-run",
            issuerParty: "issuer::abc",
            ownerParty: "owner::def",
            amountSuffix: 42,
        });

        expect(first.applicationId).toBe("sdk-live-fuzz");
        expect(first.actAs).toEqual(["issuer::abc"]);
        expect(first.readAs).toEqual([]);
        expect(first.command).toMatchObject({
            templateId: LIVE_IOU_TEMPLATE_ID,
            payload: {
                issuer: "issuer::abc",
                owner: "owner::def",
                amount: Number(createRunAmount("replay-run", 42)),
            },
        });
        expect(buildCreateRequest({
            runId: "replay-run",
            issuerParty: "issuer::abc",
            ownerParty: "owner::def",
            amountSuffix: 42,
        })).toEqual(first);
    });

    it("builds issuer-routed Archive requests and bounded amount values", () => {
        const request = buildArchiveRequest({
            contractId: "contract-1",
            issuerParty: "issuer::abc",
        });

        expect(request.actAs).toEqual(["issuer::abc"]);
        expect(request.command).toMatchObject({
            templateId: LIVE_IOU_TEMPLATE_ID,
            contractId: "contract-1",
            choice: "Archive",
            argument: {},
        });

        expect(fc.sample(createAmountArbitrary(), 1)[0]).toBeTypeOf("number");
        expect(createRunAmount("run", 99)).toMatch(/^[0-9]{1,5}\.[0-9]{5}$/);
    });

    it("generates bounded valid stateful command sequences", () => {
        const sequences = fc.sample(
            liveFuzzCommandSequenceArbitrary({ maxCommands: 8 }),
            100,
        );

        for (const sequence of sequences) {
            expect(sequence[0]).toEqual({ kind: "create" });
            expect(sequence.length).toBeLessThanOrEqual(8);
            expect(sequence.filter(({ kind }) => kind === "exercise").length).toBeLessThanOrEqual(1);
        }
    });

    it("generates exact-depth inputs with a 128-bit nonce and valid state transitions", () => {
        const inputs = fc.sample(
            liveFuzzExactInputArbitrary({
                depth: 8,
                actionWeights: readLiveFuzzConfig().actionWeights,
                actors: ["issuer", "owner"],
            }),
            100,
        );

        for (const input of inputs) {
            expect(input.commands).toHaveLength(8);
            expect(input.commands[0]).toEqual({ kind: "create" });
            expect(input.campaignNonce).toBeGreaterThanOrEqual(0n);
            expect(input.campaignNonce).toBeLessThan(2n ** 128n);

            let active = true;

            for (const command of input.commands.slice(1)) {
                if (command.kind === "fetch" || command.kind === "exercise") {
                    expect(active).toBe(true);
                }

                if (command.kind === "exercise") {
                    active = false;
                }
            }
        }
    });

    it("uses probe as the only eligible action when create was rejected", () => {
        expect(
            liveFuzzEligibleActions({
                knownContract: false,
                active: false,
                actors: ["issuer", "owner"],
            }),
        ).toEqual(["probe"]);
    });

    it("preserves deterministic exact-depth inputs for the same seed", () => {
        const arbitrary = liveFuzzExactInputArbitrary({
            depth: 6,
            actionWeights: readLiveFuzzConfig().actionWeights,
            actors: ["issuer"],
        });

        expect(fc.sample(arbitrary, { seed: 123, numRuns: 10 })).toEqual(
            fc.sample(arbitrary, { seed: 123, numRuns: 10 }),
        );
    });

    it("keeps the strict four-action smoke sequence in exact mode", () => {
        expect(
            fc.sample(
                liveFuzzExactInputArbitrary({
                    depth: 4,
                    actionWeights: readLiveFuzzConfig().actionWeights,
                    actors: ["issuer", "owner"],
                    requireArchive: true,
                }),
                1,
            )[0].commands,
        ).toEqual([
            { kind: "create" },
            { kind: "query", participant: "issuer" },
            { kind: "fetch", participant: "owner" },
            { kind: "exercise", participant: "issuer" },
        ]);
    });

    it("classifies SDK and gRPC command outcomes", () => {
        expect(
            classifyLiveFuzzCommandOutcome({ response: { transactionId: "tx-1" } }),
        ).toMatchObject({ kind: "accepted" });
        expect(
            classifyLiveFuzzCommandOutcome({
                error: {
                    code: 9,
                    details: "DAML_INTERPRETATION_ERROR(1,abc): rejected",
                },
            }),
        ).toMatchObject({ kind: "protocol-revert" });
        expect(
            classifyLiveFuzzCommandOutcome({
                error: {
                    code: 14,
                    details: "SERVICE_NOT_RUNNING(1,abc): unavailable",
                },
            }),
        ).toMatchObject({ kind: "transport-error" });
        expect(
            classifyLiveFuzzCommandOutcome({
                error: { code: 4, details: "deadline" },
            }),
        ).toMatchObject({ kind: "timeout" });
        expect(
            classifyLiveFuzzCommandOutcome({ response: {} }),
        ).toMatchObject({ kind: "malformed-response" });
        expect(
            classifyLiveFuzzCommandOutcome({ error: { code: 10, details: "ABORTED" } }),
        ).toMatchObject({ kind: "unknown-commit-outcome" });
    });

    it("changes the model only after an accepted command", () => {
        const model = createInitialLiveFuzzModel({
            templateId: LIVE_IOU_TEMPLATE_ID,
            payload: { issuer: "issuer::abc", owner: "owner::def", amount: 1 },
        });

        expect(
            applyLiveFuzzCommandOutcome(model, { kind: "create" }, {
                kind: "protocol-revert",
                statusCode: 9,
                details: "DAML_INTERPRETATION_ERROR(1,abc): rejected",
            }),
        ).toEqual(model);
        expect(
            applyLiveFuzzCommandOutcome(model, { kind: "create" }, { kind: "accepted" }),
        ).toEqual(model);
    });

    it("replays command generation from a fixed seed", () => {
        const arbitrary = liveFuzzCommandSequenceArbitrary({ maxCommands: 8 });

        expect(fc.sample(arbitrary, { seed: 123, numRuns: 10 })).toEqual(
            fc.sample(arbitrary, { seed: 123, numRuns: 10 }),
        );
    });

    it("supports the required archive smoke grammar", () => {
        expect(
            fc.sample(
                liveFuzzCommandSequenceArbitrary({
                    maxCommands: 4,
                    requireArchive: true,
                }),
                1,
            )[0],
        ).toEqual([
            { kind: "create" },
            { kind: "query", participant: "issuer" },
            { kind: "fetch", participant: "owner" },
            { kind: "exercise", participant: "issuer" },
        ]);
    });

    it("tracks model state and rejects impossible transitions", () => {
        let model = createInitialLiveFuzzModel({
            templateId: LIVE_IOU_TEMPLATE_ID,
            payload: {
                issuer: "issuer::abc",
                owner: "owner::def",
                amount: 1.23,
            },
        });

        expect(() =>
            applyLiveFuzzModelCommand(model, {
                kind: "fetch",
                participant: "issuer",
            }),
        ).toThrow(/contract ID/);

        model = applyLiveFuzzModelCommand(model, { kind: "create" });
        model = markLiveFuzzContractCreated(model, "contract-1");
        model = applyLiveFuzzModelCommand(model, {
            kind: "fetch",
            participant: "owner",
        });
        model = applyLiveFuzzModelCommand(model, {
            kind: "exercise",
            participant: "issuer",
        });

        expect(model.active).toBe(false);
        expect(() =>
            applyLiveFuzzModelCommand(model, {
                kind: "fetch",
                participant: "owner",
            }),
        ).toThrow(/active/);
        expect(
            applyLiveFuzzModelCommand(model, {
                kind: "query",
                participant: "owner",
            }).active,
        ).toBe(false);
    });

    it("compares ledger offsets numerically and summarizes Iou contracts", () => {
        expect(compareLedgerOffsets("9", "10")).toBeLessThan(0);

        const summary = summarizeLiveFuzzContract({
            createdEvent: {
                contractId: "contract-1",
                templateId: {
                    moduleName: "Main",
                    entityName: "Iou",
                },
                createArguments: {
                    fields: [
                        {
                            label: "issuer",
                            value: {
                                sum: { oneofKind: "party", party: "issuer::abc" },
                            },
                        },
                        {
                            label: "owner",
                            value: {
                                sum: { oneofKind: "party", party: "owner::def" },
                            },
                        },
                        {
                            label: "amount",
                            value: {
                                sum: { oneofKind: "numeric", numeric: "1.23000" },
                            },
                        },
                    ],
                },
            },
        });

        expect(summary).toMatchObject({
            contractId: "contract-1",
            templateId: LIVE_IOU_TEMPLATE_ID,
            payload: {
                issuer: "issuer::abc",
                owner: "owner::def",
                amount: "1.23000",
            },
        });
        expect(
            matchesLiveFuzzContract(summary, {
                templateId: LIVE_IOU_TEMPLATE_ID,
                payload: {
                    issuer: "issuer::abc",
                    owner: "owner::def",
                    amount: 1.23,
                },
            }),
        ).toBe(true);
    });

    it("formats bounded polling diagnostics", () => {
        expect(
            formatPollingTimeout({
                participant: "owner",
                expectedState: "active Main:Iou",
                runId: "replay-run",
                contractId: "contract-1",
                lastLedgerEnd: "10",
                lastContracts: ["contract-2"],
            }),
        ).toContain("owner");
    });
});
