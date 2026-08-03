import {
    CantonClient,
    OperationDeadline,
    RequestOptions,
} from "@distrohelena/canton-typescript-sdk";
import {
    comDigitalasset,
    ledgerApiV2,
} from "@distrohelena/canton-typescript-sdk/protobuf";
import { describe, expect, it } from "vitest";
import {
    runPruningPreflightWorkflowAsync,
    type PruningPreflightWorkflowDependencies,
} from "../../../examples/shared/pruning-preflight-workflow.js";

describe("pruning preflight workflow", () => {
    it("samples the authoritative watermark trio before its read-only context under one deadline", async () => {
        const trace: string[] = [];

        const requests: unknown[] = [];

        const options: RequestOptions[] = [];

        const logs: string[] = [];

        await runPruningPreflightWorkflowAsync(createDependencies({
            trace,
            requests,
            options,
            logs,
        }));

        expect(trace).toEqual([
            "deadline",
            "before",
            "ledger-end",
            "after",
            "schedule",
            "participant-schedule",
            "safe-pruning",
        ]);
        expect(requests).toEqual([
            ledgerApiV2.GetLatestPrunedOffsetsRequest.create(),
            ledgerApiV2.GetLedgerEndRequest.create(),
            ledgerApiV2.GetLatestPrunedOffsetsRequest.create(),
            comDigitalasset.canton.admin.pruning.v30.GetScheduleRequest.create(),
            comDigitalasset.canton.admin.pruning.v30.GetParticipantScheduleRequest.create(),
            comDigitalasset.canton.admin.participant.v30.GetSafePruningOffsetRequest.create({
                ledgerEnd: "50",
            }),
        ]);
        expect(new Set(options).size).toBe(6);
        expect(options.map(option => option.timeoutMs)).toEqual([99, 98, 97, 96, 95, 94]);
        expect(logs).toEqual([
            "Target offset: 43",
            "Before participant watermark: 40",
            "Before all-divulged watermark: 30",
            "Saved ledger end: 50",
            "After participant watermark: 42",
            "After all-divulged watermark: 31",
            "Classification: notObservedPruned",
            "notObservedPruned is not proven queryable.",
            "Schedule configured: false",
            "Participant schedule configured: true",
            "Participant prune internally only: true",
            "Safe pruning context: safePruningOffset",
            "Safe pruning offset: 39",
        ]);
        expect(logs.join("\n")).not.toMatch(/token|endpoint|header|cron|duration|response|\{.*\}/i);
    });

    it("short-circuits later reads when an authoritative observation fails", async () => {
        const trace: string[] = [];

        const primary = new Error("watermark read failed");

        await expect(runPruningPreflightWorkflowAsync(createDependencies({
            trace,
            beforeFailure: primary,
        }))).rejects.toBe(primary);
        expect(trace).toEqual(["deadline", "before"]);
    });

    it("does not begin participant-admin context when the sampled trio is invalid", async () => {
        const trace: string[] = [];

        await expect(runPruningPreflightWorkflowAsync(createDependencies({
            trace,
            afterParticipant: "39",
        }))).rejects.toThrow(/participant pruning watermark moved backwards/i);
        expect(trace).toEqual(["deadline", "before", "ledger-end", "after"]);
    });

    it("preserves a primary workflow error when established runner disposal also fails", async () => {
        const { runClientWorkflowWithDisposalAsync } = await import(
            "../../../examples/shared/update-stream-lifecycle.js"
        );

        const primary = new Error("workflow failed");

        const disposal = new Error("disposal failed");

        let disposeCalls = 0;

        await expect(runClientWorkflowWithDisposalAsync({
            disposeAsync: async () => {
                disposeCalls += 1;

                throw disposal;
            },
            runWorkflowAsync: async () => {
                throw primary;
            },
        })).rejects.toBe(primary);
        expect(disposeCalls).toBe(1);
    });
});

function createDependencies(init: {
    readonly trace?: string[];
    readonly requests?: unknown[];
    readonly options?: RequestOptions[];
    readonly logs?: string[];
    readonly beforeFailure?: Error;
    readonly beforeParticipant?: string;
    readonly beforeAllDivulged?: string;
    readonly ledgerEnd?: string;
    readonly afterParticipant?: string;
    readonly afterAllDivulged?: string;
} = {}): PruningPreflightWorkflowDependencies {
    const trace = init.trace ?? [];

    const requests = init.requests ?? [];

    const options = init.options ?? [];

    let now = 0;

    let watermarkCalls = 0;

    return {
        client: {
            stateService: {
                getLatestPrunedOffsetsAsync: async (request, optionsArg) => {
                    requests.push(request);
                    options.push(requireOptions(optionsArg));

                    if (watermarkCalls++ === 0) {
                        trace.push("before");

                        if (init.beforeFailure !== undefined) {
                            throw init.beforeFailure;
                        }

                        return ledgerApiV2.GetLatestPrunedOffsetsResponse.create({
                            participantPrunedUpToInclusive: init.beforeParticipant ?? "40",
                            allDivulgedContractsPrunedUpToInclusive: init.beforeAllDivulged ?? "30",
                        });
                    }

                    trace.push("after");

                    return ledgerApiV2.GetLatestPrunedOffsetsResponse.create({
                        participantPrunedUpToInclusive: init.afterParticipant ?? "42",
                        allDivulgedContractsPrunedUpToInclusive: init.afterAllDivulged ?? "31",
                    });
                },
                getLedgerEndAsync: async (request, optionsArg) => {
                    trace.push("ledger-end");
                    requests.push(request);
                    options.push(requireOptions(optionsArg));

                    return ledgerApiV2.GetLedgerEndResponse.create({
                        offset: init.ledgerEnd ?? "50",
                    });
                },
            },
            pruningService: {
                getScheduleAsync: async (request, optionsArg) => {
                    trace.push("schedule");
                    requests.push(request);
                    options.push(requireOptions(optionsArg));

                    return comDigitalasset.canton.admin.pruning.v30.GetScheduleResponse.create();
                },
                getParticipantScheduleAsync: async (request, optionsArg) => {
                    trace.push("participant-schedule");
                    requests.push(request);
                    options.push(requireOptions(optionsArg));

                    return comDigitalasset.canton.admin.pruning.v30.GetParticipantScheduleResponse.create({
                        schedule: { pruneInternallyOnly: true },
                    });
                },
                getSafePruningOffsetAsync: async (request, optionsArg) => {
                    trace.push("safe-pruning");
                    requests.push(request);
                    options.push(requireOptions(optionsArg));

                    return comDigitalasset.canton.admin.participant.v30.GetSafePruningOffsetResponse.create({
                        response: { oneofKind: "safePruningOffset", safePruningOffset: "39" },
                    });
                },
            },
        } as unknown as CantonClient,
        environment: { SDK_EXAMPLE_OFFSET: "43" },
        createDeadline: deadlineInit => {
            trace.push("deadline");

            return new OperationDeadline({
                timeoutMs: deadlineInit.timeoutMs,
                now: () => now++,
            });
        },
        timeoutMs: () => 100,
        logger: { log: message => init.logs?.push(message) },
    };
}

function requireOptions(options: RequestOptions | undefined): RequestOptions {
    if (options === undefined) {
        throw new Error("Expected request options.");
    }

    return options;
}
