import {
    CantonClient,
    GrpcTransportError,
    OperationDeadline,
    RequestOptions,
} from "@distrohelena/canton-typescript-sdk";
import { ledgerApiV2 } from "@distrohelena/canton-typescript-sdk/protobuf";
import { describe, expect, it } from "vitest";
import {
    runResumeUpdateStreamWorkflowAsync,
    type ResumeUpdateStreamWorkflowDependencies,
} from "../../../examples/shared/resume-update-stream-workflow.js";

describe("resume update-stream workflow", () => {
    it("saves one ledger end, probes it idly, then resumes from that exact offset with fresh current request options", async () => {
        const trace: string[] = [];

        const setupBudgets: number[] = [];

        const setupBudgetObjects: object[] = [];

        const options: RequestOptions[] = [];

        const streamBegins: string[] = [];

        const dependencies = createDependencies({
            trace,
            setupBudgets,
            setupBudgetObjects,
            options,
            streamBegins,
        });

        const result = await runResumeUpdateStreamWorkflowAsync(dependencies);

        expect(setupBudgets).toEqual([99, 98, 97]);
        expect(new Set(setupBudgetObjects).size).toBe(1);
        expect(streamBegins).toEqual(["saved-offset", "saved-offset"]);
        expect(options.map(option => option.timeoutMs)).toEqual([96, 95, 23, 93, 92]);
        expect(new Set(options).size).toBe(5);
        expect(result).toEqual({
            preContractId: "#pre",
            postContractId: "#post",
            updateId: "post-update",
            offset: "post-offset",
        });
        expect(trace).toEqual([
            "dar",
            "party",
            "compatibility",
            "pre-submit",
            "ledger-end",
            "idle-open",
            "idle-next",
            "idle-return",
            "log:Idle probe outcome: idle-timeout",
            "post-submit",
            "resume-open",
            "resume-next",
            "resume-next",
            "resume-return",
            "log:Update ID: post-update",
            "log:Offset: post-offset",
            "log:Pre-offset contract ID: #pre",
            "log:Post-offset contract ID: #post",
            "log:Participant version: 3.5.8-SNAPSHOT",
            "log:Release core: 3.5.8",
            "log:Compatibility path: common",
        ]);
    });

    it("rejects a pre-offset contract replay without cleanup masking", async () => {
        const dependencies = createDependencies({
            resumedUpdates: [updateFor("#pre", "pre-update", "pre-offset")],
            resumeReturnFailure: new Error("return failed"),
        });

        await expect(
            runResumeUpdateStreamWorkflowAsync(dependencies),
        ).rejects.toThrow("Pre-offset update was replayed.");
    });
});

function createDependencies(init: {
    readonly trace?: string[];
    readonly setupBudgets?: number[];
    readonly setupBudgetObjects?: object[];
    readonly options?: RequestOptions[];
    readonly streamBegins?: string[];
    readonly resumedUpdates?: readonly ledgerApiV2.GetUpdatesResponse[];
    readonly resumeReturnFailure?: Error;
} = {}): ResumeUpdateStreamWorkflowDependencies {
    const trace = init.trace ?? [];

    const setupBudgets = init.setupBudgets ?? [];

    const setupBudgetObjects = init.setupBudgetObjects ?? [];

    const options = init.options ?? [];

    const streamBegins = init.streamBegins ?? [];

    const resumedUpdates = init.resumedUpdates ?? [
        updateFor("#unrelated", "unrelated-update", "unrelated-offset"),
        updateFor("#post", "post-update", "post-offset"),
    ];

    let now = 0;

    let streamCount = 0;

    return {
        client: {
            commandService: {
                submitAndWaitForTransactionAsync: async (request, optionsArg) => {
                    if (optionsArg === undefined) {
                        throw new Error("Expected a request option for command submission.");
                    }

                    options.push(optionsArg);

                    const contractId = request.commandId?.startsWith("resume-pre-")
                        ? "#pre"
                        : "#post";

                    trace.push(contractId === "#pre" ? "pre-submit" : "post-submit");

                    return {
                        transactionId: `${contractId}-transaction`,
                        events: [{ event: { oneofKind: "created", created: { contractId } } }],
                    };
                },
            },
            stateService: {
                getLedgerEndAsync: async (_request, optionsArg) => {
                    if (optionsArg === undefined) {
                        throw new Error("Expected a request option for ledger end.");
                    }

                    options.push(optionsArg);
                    trace.push("ledger-end");

                    return { offset: "saved-offset" };
                },
            },
            updateService: {
                getUpdatesAsync: (request, optionsArg) => {
                    if (optionsArg === undefined) {
                        throw new Error("Expected a request option for update stream.");
                    }

                    options.push(optionsArg);
                    streamBegins.push(request.beginExclusive);
                    streamCount += 1;
                    trace.push(streamCount === 1 ? "idle-open" : "resume-open");

                    return streamCount === 1
                        ? idleStream(trace)
                        : resumedStream(trace, resumedUpdates, init);
                },
            },
        } as unknown as CantonClient,
        loadFixtureAsync: async () => fixture(),
        ensureDarUploadedAsync: async (_client, _fixture, requestOptionsFactory) => {
            trace.push("dar");
            setupBudgetObjects.push(requestOptionsFactory);
            setupBudgets.push(requestOptionsFactory.createRequestOptions().timeoutMs);
        },
        resolvePartyAsync: async (_client, _environment, requestOptionsFactory) => {
            trace.push("party");
            setupBudgetObjects.push(requestOptionsFactory);
            setupBudgets.push(requestOptionsFactory.createRequestOptions().timeoutMs);

            return { party: "Alice::1", allocated: false };
        },
        readCompatibilityAsync: async (_client, requestOptionsFactory) => {
            trace.push("compatibility");
            setupBudgetObjects.push(requestOptionsFactory);
            setupBudgets.push(requestOptionsFactory.createRequestOptions().timeoutMs);

            return {
                participantVersion: "3.5.8-SNAPSHOT",
                releaseCore: "3.5.8",
                path: "common",
                acceptedGrpcCodes: {
                    invalidChoice: ["INVALID_ARGUMENT"],
                    duplicateCommand: ["ALREADY_EXISTS"],
                    staleContract: ["INVALID_ARGUMENT"],
                },
            };
        },
        createDeadline: init => new OperationDeadline({
            timeoutMs: init.timeoutMs,
            now: () => now++,
        }),
        timeoutMs: () => 100,
        createRunId: () => "run-123",
        logger: {
            log: message => trace.push(`log:${message}`),
            warn: () => undefined,
        },
    };
}

function fixture() {
    return {
        darBytes: new Uint8Array(),
        mainPackageId: "package-id",
        packageIds: ["package-id"],
        templateId: {
            packageId: "package-id",
            packageName: "package-name",
            moduleName: "DebugPlayground",
            entityName: "Message",
        },
    };
}

function idleStream(trace: string[]): AsyncIterable<ledgerApiV2.GetUpdatesResponse> {
    return {
        [Symbol.asyncIterator]: () => ({
            next: async () => {
                trace.push("idle-next");

                throw deadlineExceeded();
            },
            return: async () => {
                trace.push("idle-return");

                return { done: true, value: undefined };
            },
        }),
    };
}

function resumedStream(
    trace: string[],
    updates: readonly ledgerApiV2.GetUpdatesResponse[],
    init: { readonly resumeCancellationFailure?: Error; readonly resumeReturnFailure?: Error },
): AsyncIterable<ledgerApiV2.GetUpdatesResponse> {
    let index = 0;

    return {
        [Symbol.asyncIterator]: () => ({
            next: async () => {
                trace.push("resume-next");

                return { done: false, value: updates[index++]! };
            },
            return: async () => {
                trace.push("resume-return");

                if (init.resumeReturnFailure !== undefined) {
                    throw init.resumeReturnFailure;
                }

                return { done: true, value: undefined };
            },
        }),
    };
}

function updateFor(
    contractId: string,
    updateId: string,
    offset: string,
): ledgerApiV2.GetUpdatesResponse {
    return ledgerApiV2.GetUpdatesResponse.create({
        update: {
            oneofKind: "transaction",
            transaction: ledgerApiV2.Transaction.create({
                updateId,
                offset,
                events: [{
                    event: {
                        oneofKind: "created",
                        created: ledgerApiV2.CreatedEvent.create({ contractId }),
                    },
                }],
            }),
        },
    });
}

function deadlineExceeded(): GrpcTransportError {
    const parsed = GrpcTransportError.fromUnknown(
        Object.assign(new Error("deadline exceeded"), {
            name: "RpcError",
            code: "DEADLINE_EXCEEDED",
            meta: {},
        }),
    );

    if (parsed === undefined) {
        throw new Error("Expected a normalized deadline error.");
    }

    return parsed;
}
