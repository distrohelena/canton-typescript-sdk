import {
    ActiveContractsTraversalOptions,
    CantonClient,
    CreateCommand,
    ExerciseCommand,
    GrpcTransportError,
    OperationDeadline,
    RequestOptions,
    SubmitCommandsRequest,
} from "@distrohelena/canton-typescript-sdk";
import { ledgerApiV2 } from "@distrohelena/canton-typescript-sdk/protobuf";
import { describe, expect, it } from "vitest";
import { Status } from "../../../src/transports/grpc/generated/canton/google/rpc/status.js";
import {
    runArchiveAndStaleContractWorkflowAsync,
    type ArchiveAndStaleContractWorkflowDependencies,
} from "../../../examples/shared/archive-and-stale-contract-workflow.js";
import { runArchiveAndStaleContractStandaloneAsync } from "../../../examples/shared/archive-and-stale-contract-standalone.js";

describe("archive and stale-contract workflow", () => {
    it("creates, replaces, proves the exact active state, and classifies only the structured stale rejection", async () => {
        const trace: string[] = [];

        const setupBudgets: number[] = [];

        const commandRequests: SubmitCommandsRequest[] = [];

        const commandOptions: RequestOptions[] = [];

        const activeTraversals: Array<{
            request: ledgerApiV2.GetActiveContractsPageRequest;
            options: ActiveContractsTraversalOptions;
        }> = [];

        await runArchiveAndStaleContractWorkflowAsync(createDependencies({
            trace,
            setupBudgets,
            commandRequests,
            commandOptions,
            activeTraversals,
        }));

        expect(setupBudgets).toEqual([99, 98, 97]);
        expect(commandRequests).toHaveLength(3);
        expect(commandRequests.map(request => request.commandId)).toEqual([
            "archive-create-run-123",
            "archive-replace-run-123",
            "archive-stale-run-123",
        ]);
        expect(new Set(commandRequests.map(request => request.commandId)).size).toBe(3);
        expect(commandRequests[0]?.commands[0]).toBeInstanceOf(CreateCommand);
        expect(commandRequests[1]?.commands[0]).toBeInstanceOf(ExerciseCommand);
        expect(commandRequests[2]?.commands[0]).toBeInstanceOf(ExerciseCommand);
        expect((commandRequests[1]?.commands[0] as ExerciseCommand).contractId).toBe("#original");
        expect((commandRequests[2]?.commands[0] as ExerciseCommand).contractId).toBe("#original");
        expect(commandOptions.map(option => option.timeoutMs)).toEqual([96, 95, 94]);
        expect(new Set(commandOptions).size).toBe(3);
        expect(activeTraversals).toHaveLength(1);
        expect(activeTraversals[0]?.options).toMatchObject({
            maxPages: 100,
            maxContracts: 10_000,
        });
        expect(trace).toEqual(expect.arrayContaining([
            "create-submit",
            "replace-submit",
            "stale-submit",
            "log:Original contract ID: #original",
            "log:Replacement contract ID: #replacement",
            "log:Replacement text: archive-replacement-run-123",
            "log:Stale failure kind: staleContract",
        ]));
        expect(trace).toContain(
            `log:Replacement payload: ${JSON.stringify(messageArguments("archive-replacement-run-123"))}`,
        );
        expect(trace.indexOf("create-events")).toBeLessThan(trace.indexOf("replace-submit"));
        expect(trace.indexOf("replace-events")).toBeLessThan(trace.indexOf("stale-submit"));
    });

    it("rejects an ACS snapshot that still contains the archived original", async () => {
        await expect(
            runArchiveAndStaleContractWorkflowAsync(
                createDependencies({ originalStillActive: true }),
            ),
        ).rejects.toThrow(/#original.*still active/);
    });

    it("rejects an ACS snapshot with more than one exact replacement", async () => {
        await expect(
            runArchiveAndStaleContractWorkflowAsync(
                createDependencies({ duplicateReplacement: true }),
            ),
        ).rejects.toThrow(/exactly one active Message/i);
    });

    it("rejects an ACS replacement with the right text but a different contract ID", async () => {
        await expect(
            runArchiveAndStaleContractWorkflowAsync(
                createDependencies({ wrongReplacementId: true }),
            ),
        ).rejects.toThrow("exact created contract ID");
    });

    it.each(["sender", "recipient"] as const)(
        "rejects an ACS replacement with a mismatched %s party despite exact ID and text",
        async replacementPartyMismatch => {
            await expect(
                runArchiveAndStaleContractWorkflowAsync(
                    createDependencies({ replacementPartyMismatch }),
                ),
            ).rejects.toThrow("exact Message payload");
        },
    );

    it("warns when a fallback party and durable ledger state are retained", async () => {
        const warnings: string[] = [];

        await runArchiveAndStaleContractWorkflowAsync(createDependencies({
            allocatedParty: true,
            warnings,
        }));

        expect(warnings).toEqual([
            "Warning: fallback party allocation creates durable localnet topology state and is not cleaned up.",
            "Warning: created contracts and localnet ledger state are durable and are not cleaned up.",
        ]);
    });

    it("hard-fails if exercising the archived original succeeds", async () => {
        await expect(
            runArchiveAndStaleContractWorkflowAsync(
                createDependencies({ staleSucceeds: true }),
            ),
        ).rejects.toThrow("archived original unexpectedly succeeded");
    });

    it("rejects a stale failure that lacks the structured compatibility classification", async () => {
        const unstructuredError = new Error("inactive-looking prose is not evidence");

        await expect(
            runArchiveAndStaleContractWorkflowAsync(
                createDependencies({ staleError: unstructuredError }),
            ),
        ).rejects.toBe(unstructuredError);
    });
});

describe("archive and stale-contract standalone lifecycle", () => {
    it("preserves the workflow failure when exact-once client disposal also fails", async () => {
        const workflowFailure = new Error("workflow failed");

        const cleanupFailure = new Error("cleanup failed");

        let disposeCalls = 0;

        await expect(
            runArchiveAndStaleContractStandaloneAsync({
                disposeAsync: async () => {
                    disposeCalls += 1;

                    throw cleanupFailure;
                },
                runWorkflowAsync: async () => {
                    throw workflowFailure;
                },
            }),
        ).rejects.toBe(workflowFailure);
        expect(disposeCalls).toBe(1);
    });

    it("surfaces disposal failure after a successful workflow and still disposes exactly once", async () => {
        const cleanupFailure = new Error("cleanup failed");

        let disposeCalls = 0;

        await expect(
            runArchiveAndStaleContractStandaloneAsync({
                disposeAsync: async () => {
                    disposeCalls += 1;

                    throw cleanupFailure;
                },
                runWorkflowAsync: async () => undefined,
            }),
        ).rejects.toBe(cleanupFailure);
        expect(disposeCalls).toBe(1);
    });
});

function createDependencies(init: {
    readonly trace?: string[];
    readonly setupBudgets?: number[];
    readonly commandRequests?: SubmitCommandsRequest[];
    readonly commandOptions?: RequestOptions[];
    readonly activeTraversals?: Array<{
        request: ledgerApiV2.GetActiveContractsPageRequest;
        options: ActiveContractsTraversalOptions;
    }>;
    readonly staleSucceeds?: boolean;
    readonly staleError?: Error;
    readonly originalStillActive?: boolean;
    readonly duplicateReplacement?: boolean;
    readonly wrongReplacementId?: boolean;
    readonly replacementPartyMismatch?: "sender" | "recipient";
    readonly allocatedParty?: boolean;
    readonly warnings?: string[];
}): ArchiveAndStaleContractWorkflowDependencies {
    const trace = init.trace ?? [];

    const setupBudgets = init.setupBudgets ?? [];

    const commandRequests = init.commandRequests ?? [];

    const commandOptions = init.commandOptions ?? [];

    const activeTraversals = init.activeTraversals ?? [];

    let now = 0;

    let commandCount = 0;

    let pageCount = 0;

    return {
        client: {
            commandService: {
                submitAndWaitForTransactionAsync: async (request, options) => {
                    commandCount += 1;
                    commandRequests.push(request);

                    if (options === undefined) {
                        throw new Error("Expected command options.");
                    }

                    commandOptions.push(options);

                    if (commandCount === 1) {
                        trace.push("create-submit");

                        return createdResponse(trace, "#original");
                    } else if (commandCount === 2) {
                        trace.push("replace-submit");

                        return replacementResponse(trace);
                    }

                    trace.push("stale-submit");

                    if (init.staleSucceeds) {
                        return createdResponse(trace, "#stale");
                    }

                    throw init.staleError ?? staleContractError();
                },
            },
            stateService: {
                getActiveContractsPagesAsync: async function* (request, options) {
                    activeTraversals.push({ request, options });

                    for (const page of [1, 2]) {
                        pageCount = page;

                        yield ledgerApiV2.GetActiveContractsPageResponse.create(
                        pageCount === 1
                            ? {
                                activeAtOffset: "42",
                                nextPageToken: new Uint8Array([1]),
                                activeContracts: [activeContractResponse("#other", "unrelated")],
                            }
                            : {
                                activeAtOffset: "42",
                                activeContracts: activeContractsForSecondPage(init),
                            },
                        );
                    }
                },
            },
        } as unknown as CantonClient,
        loadFixtureAsync: async () => fixture(),
        ensureDarUploadedAsync: async (_client, _fixture, requestOptionsFactory) => {
            setupBudgets.push(requestOptionsFactory.createRequestOptions().timeoutMs);

            return { alreadyInstalled: true };
        },
        resolvePartyAsync: async (_client, _environment, requestOptionsFactory) => {
            setupBudgets.push(requestOptionsFactory.createRequestOptions().timeoutMs);

            return { party: "Alice::1", allocated: init.allocatedParty ?? false };
        },
        readCompatibilityAsync: async (_client, requestOptionsFactory) => {
            setupBudgets.push(requestOptionsFactory.createRequestOptions().timeoutMs);

            return compatibility();
        },
        createDeadline: init => new OperationDeadline({
            timeoutMs: init.timeoutMs,
            now: () => now++,
        }),
        timeoutMs: () => 100,
        createRunId: () => "run-123",
        logger: {
            log: message => trace.push(`log:${message}`),
            warn: message => init.warnings?.push(message),
        },
    };
}

function fixture() {
    return {
        darBytes: new Uint8Array(), mainPackageId: "package-id", packageIds: ["package-id"],
        templateId: { packageId: "package-id", packageName: "package-name", moduleName: "DebugPlayground", entityName: "Message" },
    };
}

function compatibility() {
    return {
        participantVersion: "3.5.8-SNAPSHOT", releaseCore: "3.5.8" as const, path: "common",
        acceptedGrpcCodes: { invalidChoice: ["INVALID_ARGUMENT"], duplicateCommand: ["ALREADY_EXISTS"], staleContract: ["INVALID_ARGUMENT"] },
    };
}

function createdResponse(trace: string[], contractId: string) {
    return { transactionId: "transaction", get events(): readonly unknown[] {
        trace.push("create-events");

        return [{ event: { oneofKind: "created", created: { contractId } } }];
    } };
}

function replacementResponse(trace: string[]) {
    return { transactionId: "transaction", get events(): readonly unknown[] { trace.push("replace-events");

    return [
        { event: { oneofKind: "archived", archived: { contractId: "#original" } } },
        { event: { oneofKind: "created", created: { contractId: "#replacement" } } },
    ]; } };
}

function activeContractResponse(
    contractId: string,
    text: string,
    sender?: string,
    recipient?: string,
): ledgerApiV2.GetActiveContractsResponse {
    return ledgerApiV2.GetActiveContractsResponse.create({ contractEntry: { oneofKind: "activeContract", activeContract: ledgerApiV2.ActiveContract.create({ createdEvent: ledgerApiV2.CreatedEvent.create({ contractId, createArguments: messageArguments(text, sender, recipient) }) }) } });
}

function activeContractsForSecondPage(init: {
    readonly originalStillActive?: boolean;
    readonly duplicateReplacement?: boolean;
    readonly wrongReplacementId?: boolean;
    readonly replacementPartyMismatch?: "sender" | "recipient";
}): ledgerApiV2.GetActiveContractsResponse[] {
    const replacement = activeContractResponse(
        "#replacement",
        "archive-replacement-run-123",
    );

    if (init.originalStillActive) {
        return [
            activeContractResponse("#original", "archive-original-run-123"),
            replacement,
        ];
    } else if (init.duplicateReplacement) {
        return [replacement, activeContractResponse(
            "#replacement-duplicate",
            "archive-replacement-run-123",
        )];
    } else if (init.wrongReplacementId) {
        return [activeContractResponse(
            "#wrong-replacement",
            "archive-replacement-run-123",
        )];
    } else if (init.replacementPartyMismatch !== undefined) {
        return [activeContractResponse(
            "#replacement",
            "archive-replacement-run-123",
            init.replacementPartyMismatch === "sender" ? "Bob::1" : "Alice::1",
            init.replacementPartyMismatch === "recipient" ? "Bob::1" : "Alice::1",
        )];
    }

    return [replacement];
}

function messageArguments(
    text: string,
    sender = "Alice::1",
    recipient = "Alice::1",
): ledgerApiV2.Record {
    return ledgerApiV2.Record.create({
        fields: [{
            label: "sender",
            value: { sum: { oneofKind: "party", party: sender } },
        }, {
            label: "recipient",
            value: { sum: { oneofKind: "party", party: recipient } },
        }, {
            label: "text",
            value: { sum: { oneofKind: "text", text } },
        }],
    });
}

function staleContractError(): GrpcTransportError {
    const raw = Object.assign(new Error("inactive contract"), { name: "RpcError", code: "INVALID_ARGUMENT", serviceName: "com.daml.ledger.api.v2.CommandService", methodName: "SubmitAndWaitForTransaction", meta: { "grpc-status-details-bin": Status.toBinary({ code: 3, message: "inactive contract", details: [] }) } });

    const parsed = GrpcTransportError.fromUnknown(raw);

    if (parsed === undefined) {
        throw new Error("Expected a normalized stale-contract test error.");
    }

    return parsed;
}
