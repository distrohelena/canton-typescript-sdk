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

const environmentKeys = [
    "SDK_TEST_ENABLE_LIVE_FUZZING",
    "FUZZ_NUM_RUNS",
    "FUZZ_SEED",
    "FUZZ_PATH",
    "FUZZ_LIVE_MAX_COMMANDS",
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
            maxCommands: 8,
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
        process.env.FUZZ_LIVE_RUN_ID = "replay-run";
        process.env.FUZZ_LIVE_ISSUER_PARTY = "issuer::abc";
        process.env.FUZZ_LIVE_OWNER_PARTY = "owner::def";

        expect(readLiveFuzzConfig()).toMatchObject({
            enabled: true,
            numRuns: 7,
            seed: 123,
            path: "0:1",
            requireArchive: true,
            runId: "replay-run",
            issuerParty: "issuer::abc",
            ownerParty: "owner::def",
        });
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
