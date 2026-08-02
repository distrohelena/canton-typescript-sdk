import {
    CantonClient,
    CreateCommand,
    ExerciseCommand,
    OperationDeadline,
    RequestOptions,
    SubmitCommandRequest,
} from "@distrohelena/canton-typescript-sdk";
import { readFileSync } from "node:fs";
import { ledgerApiV2 } from "@distrohelena/canton-typescript-sdk/protobuf";
import { describe, expect, it } from "vitest";
import {
    runContractLifecycleAuditWorkflowAsync,
    type ContractLifecycleAuditWorkflowDependencies,
} from "../../../examples/shared/contract-lifecycle-audit-workflow.js";
import { runClientWorkflowWithDisposalAsync } from "../../../examples/shared/update-stream-lifecycle.js";

describe("contract lifecycle audit workflow", () => {
    it("audits exact direct and historical lifecycle evidence under one deadline", async () => {
        const trace: string[] = [];

        const setupOptions: RequestOptions[] = [];

        const commandRequests: SubmitCommandRequest[] = [];

        const commandOptions: RequestOptions[] = [];

        const directRequests: ledgerApiV2.GetContractRequest[] = [];

        const directOptions: RequestOptions[] = [];

        const historyRequests: ledgerApiV2.GetEventsByContractIdRequest[] = [];

        const historyOptions: RequestOptions[] = [];

        const logs: string[] = [];

        const warnings: string[] = [];

        await runContractLifecycleAuditWorkflowAsync(createDependencies({
            trace,
            setupOptions,
            commandRequests,
            commandOptions,
            directRequests,
            directOptions,
            historyRequests,
            historyOptions,
            logs,
            warnings,
            allocatedParty: true,
        }));

        expect(trace).toEqual([
            "deadline",
            "fixture",
            "dar",
            "party",
            "compatibility",
            "create",
            "original-lookup",
            "replace",
            "replacement-lookup",
            "history",
        ]);
        expect(setupOptions.map(option => option.timeoutMs)).toEqual([99, 98, 97]);
        expect(commandRequests.map(request => request.commandId)).toEqual([
            "contract-lifecycle-create-run-123",
            "contract-lifecycle-replace-run-123",
        ]);
        expect(commandRequests[0]?.command).toBeInstanceOf(CreateCommand);
        expect(commandRequests[1]?.command).toBeInstanceOf(ExerciseCommand);
        expect((commandRequests[1]?.command as ExerciseCommand).contractId).toBe("#original");
        expect((commandRequests[0]?.command as CreateCommand).createArguments.fields.text)
            .toBe("contract-lifecycle-original-run-123");
        expect((commandRequests[1]?.command as ExerciseCommand).choiceArgument.fields.replacement)
            .toBe("contract-lifecycle-replacement-run-123");
        expect(commandOptions.map(option => option.timeoutMs)).toEqual([96, 94]);
        expect(directRequests).toEqual([
            ledgerApiV2.GetContractRequest.create({
                contractId: "#original",
                queryingParties: ["Alice"],
            }),
            ledgerApiV2.GetContractRequest.create({
                contractId: "#replacement",
                queryingParties: ["Alice"],
            }),
        ]);
        expect(directRequests[0]).not.toBe(directRequests[1]);
        expect(historyRequests).toHaveLength(1);
        expect(historyRequests[0]?.contractId).toBe("#original");
        expect(historyRequests[0]?.eventFormat.filtersByParty.Alice).toBeDefined();
        expect(new Set([
            ...setupOptions,
            ...commandOptions,
            ...directOptions,
            ...historyOptions,
        ]).size).toBe(8);
        expect(new Set(directOptions).size).toBe(2);
        expect(new Set(historyOptions).size).toBe(1);
        expect(directOptions.map(option => option.timeoutMs)).toEqual([95, 93]);
        expect(historyOptions.map(option => option.timeoutMs)).toEqual([92]);
        expect(commandRequests).toHaveLength(2);
        expect(warnings).toEqual([
            "Warning: uploading a DAR creates durable localnet package state and is not cleaned up.",
            "Warning: fallback party allocation creates durable localnet topology state and is not cleaned up.",
            "Warning: created contracts and localnet ledger state are durable and are not cleaned up.",
        ]);
        expect(logs).toEqual(expect.arrayContaining([
            "Run marker: run-123",
            "Actor party: Alice",
            "Original contract ID: #original",
            "Original text: contract-lifecycle-original-run-123",
            "Replacement contract ID: #replacement",
            "Replacement text: contract-lifecycle-replacement-run-123",
            "Created synchronizer ID: sync-created",
            "Archived synchronizer ID: sync-archived",
            "Participant version: 3.5.8-SNAPSHOT",
            "Release core: 3.5.8",
            "Compatibility path: common",
        ]));
        expect(logs.join("\n")).not.toMatch(/token|endpoint|header|darBytes|response|\{.*\}/i);
    });

    it.each([
        ["wrong archived contract", { archivedContractId: "#other" }],
        ["empty replacement contract", { replacementContractId: " " }],
        ["equal replacement contract", { replacementContractId: "#original" }],
    ])("rejects a replacement response with %s", async (_label, response) => {
        await expect(runContractLifecycleAuditWorkflowAsync(createDependencies(response)))
            .rejects.toThrow(/ReplaceText|non-empty/);
    });

    it("propagates direct lookup and history projection assertion failures", async () => {
        await expect(runContractLifecycleAuditWorkflowAsync(createDependencies({
            invalidOriginalLookup: true,
        }))).rejects.toThrow(/expected contract ID/i);
        await expect(runContractLifecycleAuditWorkflowAsync(createDependencies({
            invalidHistory: true,
        }))).rejects.toThrow(/expected contract ID/i);
    });

    it("keeps a primary workflow failure when lifecycle disposal fails", async () => {
        const primary = new Error("primary workflow failure");

        const disposal = new Error("disposal failure");

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

    it("uses the established lifecycle-owning standalone runner", () => {
        const source = readFileSync(
            new URL("../../../examples/95-contract-lifecycle-audit.ts", import.meta.url),
            "utf8",
        );

        expect([...source.matchAll(/createExampleClient\(/g)]).toHaveLength(1);
        expect([...source.matchAll(/runClientWorkflowWithDisposalAsync\(/g)]).toHaveLength(1);
        expect([...source.matchAll(/client\.disposeAsync\(\)/g)]).toHaveLength(1);
        expect(source).toMatch(/createRunId:\s*\(\)\s*=>\s*randomBytes\(12\)\.toString\("hex"\)/);
        expect(source).toContain("logger: console");
    });
});

function createDependencies(init: {
    readonly trace?: string[];
    readonly setupOptions?: RequestOptions[];
    readonly commandRequests?: SubmitCommandRequest[];
    readonly commandOptions?: RequestOptions[];
    readonly directRequests?: ledgerApiV2.GetContractRequest[];
    readonly directOptions?: RequestOptions[];
    readonly historyRequests?: ledgerApiV2.GetEventsByContractIdRequest[];
    readonly historyOptions?: RequestOptions[];
    readonly logs?: string[];
    readonly warnings?: string[];
    readonly allocatedParty?: boolean;
    readonly archivedContractId?: string;
    readonly replacementContractId?: string;
    readonly invalidOriginalLookup?: boolean;
    readonly invalidHistory?: boolean;
}): ContractLifecycleAuditWorkflowDependencies {
    const trace = init.trace ?? [];

    const setupOptions = init.setupOptions ?? [];

    const commandRequests = init.commandRequests ?? [];

    const commandOptions = init.commandOptions ?? [];

    const directRequests = init.directRequests ?? [];

    const directOptions = init.directOptions ?? [];

    const historyRequests = init.historyRequests ?? [];

    const historyOptions = init.historyOptions ?? [];

    let now = 0;

    let commandCount = 0;

    return {
        client: {
            commandService: {
                submitAndWaitForTransactionAsync: async (request, options) => {
                    commandRequests.push(request);

                    commandOptions.push(requireOptions(options));

                    if (commandCount++ === 0) {
                        trace.push("create");

                        return createdResponse("#original");
                    }

                    trace.push("replace");

                    return replacementResponse({
                        archivedContractId: init.archivedContractId,
                        replacementContractId: init.replacementContractId,
                    });
                },
            },
            contractService: {
                getContractAsync: async (request, options) => {
                    directRequests.push(request);

                    directOptions.push(requireOptions(options));

                    trace.push(request.contractId === "#original"
                        ? "original-lookup"
                        : "replacement-lookup");

                    return directResponse(
                        request.contractId,
                        request.contractId === "#original"
                            ? "contract-lifecycle-original-run-123"
                            : "contract-lifecycle-replacement-run-123",
                        init.invalidOriginalLookup && request.contractId === "#original",
                    );
                },
            },
            eventQueryService: {
                getEventsByContractIdAsync: async (request, options) => {
                    historyRequests.push(request);

                    historyOptions.push(requireOptions(options));

                    trace.push("history");

                    return historyResponse(init.invalidHistory);
                },
            },
        } as unknown as CantonClient,
        loadFixtureAsync: async () => {
            trace.push("fixture");

            return fixture();
        },
        ensureDarUploadedAsync: async (_client, _fixture, deadline) => {
            trace.push("dar");

            setupOptions.push(deadline.createRequestOptions());

            return { alreadyInstalled: true };
        },
        resolvePartyAsync: async (_client, environment, deadline) => {
            expect(environment).toBe(process.env);

            trace.push("party");

            setupOptions.push(deadline.createRequestOptions());

            return { party: "Alice", allocated: init.allocatedParty ?? false };
        },
        readCompatibilityAsync: async (_client, deadline) => {
            trace.push("compatibility");

            setupOptions.push(deadline.createRequestOptions());

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
        createDeadline: deadlineInit => {
            trace.push("deadline");

            return new OperationDeadline({ timeoutMs: deadlineInit.timeoutMs, now: () => now++ });
        },
        timeoutMs: () => 100,
        createRunId: () => "run-123",
        sleepAsync: async () => undefined,
        logger: {
            log: message => init.logs?.push(message),
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

function requireOptions(options: RequestOptions | undefined): RequestOptions {
    if (options === undefined) {
        throw new Error("Expected request options.");
    }

    return options;
}

function createdResponse(contractId: string) {
    return { transactionId: "transaction", events: [{ event: { oneofKind: "created", created: { contractId } } }] };
}

function replacementResponse(init: { archivedContractId?: string; replacementContractId?: string }) {
    return { transactionId: "transaction", events: [
        { event: { oneofKind: "archived", archived: { contractId: init.archivedContractId ?? "#original" } } },
        { event: { oneofKind: "created", created: { contractId: init.replacementContractId ?? "#replacement" } } },
    ] };
}

function directResponse(contractId: string, text: string, invalid: boolean) {
    return ledgerApiV2.GetContractResponse.create({ createdEvent: ledgerApiV2.CreatedEvent.create({
        contractId: invalid ? "#wrong" : contractId,
        templateId: ledgerApiV2.Identifier.create({ packageId: "package-id", moduleName: "DebugPlayground", entityName: "Message" }),
        createArguments: messageArguments(text),
        witnessParties: ["Alice"], signatories: ["Alice"], observers: [],
    }) });
}

function historyResponse(invalid = false) {
    return ledgerApiV2.GetEventsByContractIdResponse.create({
        created: ledgerApiV2.Created.create({ createdEvent: ledgerApiV2.CreatedEvent.create({
            contractId: invalid ? "#wrong" : "#original",
            templateId: ledgerApiV2.Identifier.create({ packageId: "package-id", moduleName: "DebugPlayground", entityName: "Message" }),
            createArguments: messageArguments("contract-lifecycle-original-run-123"),
            witnessParties: ["Alice"], signatories: ["Alice"], observers: [],
        }), synchronizerId: "sync-created" }),
        archived: ledgerApiV2.Archived.create({ archivedEvent: ledgerApiV2.ArchivedEvent.create({
            contractId: "#original", templateId: ledgerApiV2.Identifier.create({ packageId: "package-id", moduleName: "DebugPlayground", entityName: "Message" }), witnessParties: ["Alice"],
        }), synchronizerId: "sync-archived" }),
    });
}

function messageArguments(text: string) {
    return ledgerApiV2.Record.create({ fields: [
        { label: "sender", value: { sum: { oneofKind: "party", party: "Alice" } } },
        { label: "recipient", value: { sum: { oneofKind: "party", party: "Alice" } } },
        { label: "text", value: { sum: { oneofKind: "text", text } } },
    ] });
}
