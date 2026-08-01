import {
    CantonClient,
    GrpcTransportError,
} from "@distrohelena/canton-typescript-sdk";
import { ledgerApiV2 } from "@distrohelena/canton-typescript-sdk/protobuf";
import { describe, expect, it } from "vitest";
import { Status } from "../../../src/transports/grpc/generated/canton/google/rpc/status.js";
import {
    runIdempotentCommandRetryWorkflowAsync,
    type IdempotentCommandRetryWorkflowDependencies,
} from "../../../examples/shared/idempotent-command-retry-workflow.js";

describe("idempotent command retry workflow", () => {
    it("reuses the unmutated request, processes the first response before a structured retry, and gives every call a fresh current budget", async () => {
        const trace: string[] = [];

        const setupBudgets: number[] = [];

        const commandCalls: Array<{ request: unknown; timeoutMs: number | undefined }> = [];

        const activeContractCalls: Array<{
            request: ledgerApiV2.GetActiveContractsPageRequest;
            timeoutMs: number | undefined;
        }> = [];

        const logger = { log: (message: string) => trace.push(`log:${message}`), warn: () => undefined };

        const dependencies = createDependencies({
            trace,
            setupBudgets,
            commandCalls,
            activeContractCalls,
            logger,
        });

        await runIdempotentCommandRetryWorkflowAsync(dependencies);

        expect(setupBudgets).toEqual([100, 99, 98]);
        expect(commandCalls).toHaveLength(2);
        expect(commandCalls[0]?.request).toBe(commandCalls[1]?.request);
        expect(commandCalls.map(call => call.timeoutMs)).toEqual([97, 96]);
        expect(commandCalls[0]?.timeoutMs).not.toBe(commandCalls[1]?.timeoutMs);
        expect(activeContractCalls).toHaveLength(2);
        expect(activeContractCalls.map(call => call.timeoutMs)).toEqual([94, 93]);
        expect(activeContractCalls[0]?.timeoutMs).not.toBe(
            activeContractCalls[1]?.timeoutMs,
        );
        expect(activeContractCalls[1]?.request.activeAtOffset).toBe("42");
        expect(trace).toEqual(expect.arrayContaining([
            "first-submit",
            "first-transaction-id",
            "first-events",
            "retry-submit",
        ]));
        expect(trace.indexOf("first-transaction-id")).toBeLessThan(
            trace.indexOf("retry-submit"),
        );
        expect(trace.indexOf("first-events")).toBeLessThan(
            trace.indexOf("retry-submit"),
        );
        expect(trace).toContain("log:Active count: 1");
        expect(trace).toContain("log:Duplicate command kind: duplicateCommand");
    });

    it("hard-fails when the retry succeeds instead of accepting a second creation", async () => {
        const dependencies = createDependencies({ retrySucceeds: true });

        await expect(
            runIdempotentCommandRetryWorkflowAsync(dependencies),
        ).rejects.toThrow("duplicate command retry unexpectedly succeeded");
    });

    it("rejects a retry that lacks the structured duplicate-command classification", async () => {
        const unstructuredError = new Error("duplicate-looking prose is not evidence");

        const dependencies = createDependencies({ retryError: unstructuredError });

        await expect(
            runIdempotentCommandRetryWorkflowAsync(dependencies),
        ).rejects.toThrow(unstructuredError);
    });

    it("rejects a duplicate active Message instead of merely reporting an active count", async () => {
        const dependencies = createDependencies({ duplicateActiveMessages: true });

        await expect(
            runIdempotentCommandRetryWorkflowAsync(dependencies),
        ).rejects.toThrow(/exactly one active Message/i);
    });
});

function createDependencies(init: {
    readonly trace?: string[];
    readonly setupBudgets?: number[];
    readonly commandCalls?: Array<{ request: unknown; timeoutMs: number | undefined }>;
    readonly activeContractCalls?: Array<{
        request: ledgerApiV2.GetActiveContractsPageRequest;
        timeoutMs: number | undefined;
    }>;
    readonly logger?: { log: (message: string) => void; warn: (message: string) => void };
    readonly retrySucceeds?: boolean;
    readonly retryError?: Error;
    readonly duplicateActiveMessages?: boolean;
}): IdempotentCommandRetryWorkflowDependencies {
    const trace = init.trace ?? [];

    const setupBudgets = init.setupBudgets ?? [];

    const commandCalls = init.commandCalls ?? [];

    const activeContractCalls = init.activeContractCalls ?? [];

    let remainingMs = 100;

    let commandSubmissionCount = 0;

    let activeContractPageCount = 0;

    const marker = "retry-marker-run-123";

    const firstResponse = {
        get transactionId(): string {
            trace.push("first-transaction-id");

            return "transaction-1";
        },
        get events(): readonly unknown[] {
            trace.push("first-events");

            return [{ event: { oneofKind: "created", created: { contractId: "#message-1" } } }];
        },
    };

    return {
        client: {
            commandService: {
                submitAndWaitForTransactionAsync: async (request, options) => {
                    commandSubmissionCount += 1;
                    commandCalls.push({ request, timeoutMs: options?.timeoutMs });

                    if (commandSubmissionCount === 1) {
                        trace.push("first-submit");
                        deepFreeze(request);

                        return firstResponse;
                    }

                    trace.push("retry-submit");

                    if (init.retrySucceeds) {
                        return firstResponse;
                    }

                    throw init.retryError ?? duplicateCommandError();
                },
            },
            stateService: {
                getActiveContractsPageAsync: async (request, options) => {
                    activeContractPageCount += 1;
                    activeContractCalls.push({ request, timeoutMs: options?.timeoutMs });

                    return ledgerApiV2.GetActiveContractsPageResponse.create(
                        activeContractPageCount === 1
                            ? {
                                  activeAtOffset: "42",
                                  nextPageToken: new Uint8Array([1]),
                                  activeContracts: [activeContractResponse("#other", "other")],
                              }
                            : {
                                  activeAtOffset: "42",
                                  activeContracts: init.duplicateActiveMessages
                                      ? [
                                              activeContractResponse("#message-1", marker),
                                              activeContractResponse("#message-2", marker),
                                          ]
                                      : [activeContractResponse("#message-1", marker)],
                              },
                    );
                },
            },
        } as unknown as CantonClient,
        loadFixtureAsync: async () => ({
            darBytes: new Uint8Array(),
            mainPackageId: "package-id",
            packageIds: ["package-id"],
            templateId: {
                packageId: "package-id",
                packageName: "package-name",
                moduleName: "DebugPlayground",
                entityName: "Message",
            },
        }),
        ensureDarUploadedAsync: async (_client, _fixture, budget) => {
            trace.push("dar");
            setupBudgets.push(budget.remainingTimeoutMs());

            return { alreadyInstalled: true };
        },
        resolvePartyAsync: async (_client, _environment, budget) => {
            trace.push("party");
            setupBudgets.push(budget.remainingTimeoutMs());

            return { party: "Alice::1", allocated: false };
        },
        readCompatibilityAsync: async (_client, budget) => {
            trace.push("compatibility");
            setupBudgets.push(budget.remainingTimeoutMs());

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
        createDeadline: () => ({
            idleProbeMs: () => 1,
            remainingMs: () => {
                const current = remainingMs;

                remainingMs -= 1;

                return current;
            },
        }),
        timeoutMs: () => 100,
        createRunId: () => "run-123",
        logger: init.logger ?? { log: () => undefined, warn: () => undefined },
    };
}

function activeContractResponse(
    contractId: string,
    text: string,
): ledgerApiV2.GetActiveContractsResponse {
    return ledgerApiV2.GetActiveContractsResponse.create({
        contractEntry: {
            oneofKind: "activeContract",
            activeContract: ledgerApiV2.ActiveContract.create({
                createdEvent: ledgerApiV2.CreatedEvent.create({
                    contractId,
                    createArguments: ledgerApiV2.Record.create({
                        fields: [{
                            label: "text",
                            value: { sum: { oneofKind: "text", text } },
                        }],
                    }),
                }),
            }),
        },
    });
}

function duplicateCommandError(): GrpcTransportError {
    const raw = Object.assign(new Error("duplicate command"), {
        name: "RpcError",
        code: "ALREADY_EXISTS",
        serviceName: "com.daml.ledger.api.v2.CommandService",
        methodName: "SubmitAndWaitForTransaction",
        meta: {
            "grpc-status-details-bin": Status.toBinary({
                code: 6,
                message: "duplicate command",
                details: [],
            }),
        },
    });

    const parsed = GrpcTransportError.fromUnknown(raw);

    if (parsed === undefined) {
        throw new Error("Expected a normalized duplicate-command test error.");
    }

    return parsed;
}

function deepFreeze<T>(value: T): T {
    if (typeof value !== "object" || value === null || Object.isFrozen(value)) {
        return value;
    }

    for (const child of Object.values(value)) {
        deepFreeze(child);
    }

    return Object.freeze(value);
}
