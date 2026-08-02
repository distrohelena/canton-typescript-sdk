import {
    CantonClient,
    GrpcTransportError,
    OperationDeadline,
    RequestOptions,
    SubmitCommandRequest,
} from "@distrohelena/canton-typescript-sdk";
import { ledgerApiV2 } from "@distrohelena/canton-typescript-sdk/protobuf";
import { describe, expect, it } from "vitest";
import {
    runUpdateLookupReconciliationWorkflowAsync,
    type UpdateLookupReconciliationWorkflowDependencies,
} from "../../../examples/shared/update-lookup-reconciliation-workflow.js";

describe("update lookup reconciliation workflow", () => {
    it("opens one ACS-delta stream before submission then reconciles the captured transaction by ID and offset", async () => {
        const trace: string[] = [];

        const options: RequestOptions[] = [];

        const updateRequests: ledgerApiV2.GetUpdatesRequest[] = [];

        const byIdRequests: ledgerApiV2.GetUpdateByIdRequest[] = [];

        const byOffsetRequests: ledgerApiV2.GetUpdateByOffsetRequest[] = [];

        const logs: string[] = [];

        await runUpdateLookupReconciliationWorkflowAsync(createDependencies({
            trace,
            options,
            updateRequests,
            byIdRequests,
            byOffsetRequests,
            logs,
            streamResponses: [unrelatedResponse(), matchingResponse()],
        }));

        expect(trace).toEqual([
            "deadline", "fixture", "dar", "party", "compatibility", "ledger-end",
            "stream", "next", "submit", "next", "lookup-id", "lookup-offset", "return",
        ]);
        expect(updateRequests).toEqual([ledgerApiV2.GetUpdatesRequest.create({
            beginExclusive: "42",
            updateFormat: updateRequests[0]?.updateFormat,
            descendingOrder: false,
        })]);
        expect(updateRequests[0]?.updateFormat).toBeDefined();
        expect(updateRequests[0]?.updateFormat).toStrictEqual(byIdRequests[0]?.updateFormat);
        expect(updateRequests[0]?.updateFormat).toStrictEqual(byOffsetRequests[0]?.updateFormat);
        expect(byIdRequests).toEqual([ledgerApiV2.GetUpdateByIdRequest.create({
            updateId: "update-1", updateFormat: updateRequests[0]?.updateFormat,
        })]);
        expect(byOffsetRequests).toEqual([ledgerApiV2.GetUpdateByOffsetRequest.create({
            offset: "43", updateFormat: updateRequests[0]?.updateFormat,
        })]);
        expect(options.map(option => option.timeoutMs)).toEqual([99, 98, 97, 96, 95, 94, 93, 92]);
        expect(new Set(options).size).toBe(options.length);
        expect(logs).toEqual(expect.arrayContaining([
            "Run marker: run-123",
            "Actor party: Alice",
            "Contract ID: #message",
            "Update ID: update-1",
            "Offset: 43",
            "Synchronizer ID: sync-1",
            "Update ID lookup reconciled: true",
            "Update offset lookup reconciled: true",
            "Participant version: 3.5.8-SNAPSHOT",
            "Release core: 3.5.8",
            "Compatibility path: common",
        ]));
        expect(logs.join("\n")).not.toMatch(/token|endpoint|header|hash|response|\{.*\}/i);
    });

    it("rejects an empty saved ledger end before opening the stream", async () => {
        const trace: string[] = [];

        await expect(runUpdateLookupReconciliationWorkflowAsync(createDependencies({
            trace, ledgerEnd: " ",
        }))).rejects.toThrow(/ledger end.*non-empty/i);
        expect(trace).toEqual(["deadline", "fixture", "dar", "party", "compatibility", "ledger-end"]);
    });

    it("closes the iterator exactly once after a primary stream, submit, or lookup failure without masking it", async () => {
        for (const failurePoint of ["stream", "submit", "lookup"] as const) {
            const primary = new Error(`${failurePoint} failed`);

            const cleanup = new Error("return failed");

            const returns: string[] = [];

            await expect(runUpdateLookupReconciliationWorkflowAsync(createDependencies({
                streamResponses: failurePoint === "stream" ? [Promise.reject(primary)] : [matchingResponse()],
                submitFailure: failurePoint === "submit" ? primary : undefined,
                lookupFailure: failurePoint === "lookup" ? primary : undefined,
                returnFailure: cleanup,
                returns,
            }))).rejects.toBe(primary);
            expect(returns).toEqual(["return"]);
        }
    });

    it("maps a deadline from the primed first stream read while preserving its cause and cleanup semantics", async () => {
        const deadline = deadlineExceeded();

        const cleanup = new Error("return failed");

        const returns: string[] = [];

        const result = runUpdateLookupReconciliationWorkflowAsync(createDependencies({
            streamResponses: [Promise.reject(deadline)],
            returnFailure: cleanup,
            returns,
        }));

        await expect(result).rejects.toThrow(/update stream timed out.*SDK_EXAMPLE_TIMEOUT_MS/i);
        await expect(result).rejects.toMatchObject({ cause: deadline });
        expect(returns).toEqual(["return"]);
    });

    it("maps a deadline from a later stream read while preserving its cause and cleanup semantics", async () => {
        const deadline = deadlineExceeded();

        const cleanup = new Error("return failed");

        const returns: string[] = [];

        const result = runUpdateLookupReconciliationWorkflowAsync(createDependencies({
            streamResponses: [unrelatedResponse(), Promise.reject(deadline)],
            returnFailure: cleanup,
            returns,
        }));

        await expect(result).rejects.toThrow(/update stream timed out.*SDK_EXAMPLE_TIMEOUT_MS/i);
        await expect(result).rejects.toMatchObject({ cause: deadline });
        expect(returns).toEqual(["return"]);
    });

    it("surfaces a cleanup failure after an otherwise successful reconciliation", async () => {
        const cleanup = new Error("return failed");

        await expect(runUpdateLookupReconciliationWorkflowAsync(createDependencies({
            streamResponses: [matchingResponse()], returnFailure: cleanup,
        }))).rejects.toBe(cleanup);
    });
});

function createDependencies(init: {
    readonly trace?: string[];
    readonly options?: RequestOptions[];
    readonly updateRequests?: ledgerApiV2.GetUpdatesRequest[];
    readonly byIdRequests?: ledgerApiV2.GetUpdateByIdRequest[];
    readonly byOffsetRequests?: ledgerApiV2.GetUpdateByOffsetRequest[];
    readonly logs?: string[];
    readonly ledgerEnd?: string;
    readonly streamResponses?: readonly (ledgerApiV2.GetUpdatesResponse | Promise<ledgerApiV2.GetUpdatesResponse>)[];
    readonly submitFailure?: Error;
    readonly lookupFailure?: Error;
    readonly returnFailure?: Error;
    readonly returns?: string[];
} = {}): UpdateLookupReconciliationWorkflowDependencies {
    const trace = init.trace ?? [];

    const options = init.options ?? [];

    const responses = init.streamResponses ?? [matchingResponse()];

    const returns = init.returns ?? [];

    let now = 0;

    let cursor = 0;

    const iterator: AsyncIterator<ledgerApiV2.GetUpdatesResponse> = {
        next: async () => {
            trace.push("next");

            const next = responses[cursor++];

            if (next === undefined) {
                return { done: true, value: undefined };
            }

            return { done: false, value: await next };
        },
        return: async () => {
            trace.push("return"); returns.push("return");

            if (init.returnFailure !== undefined) {
                throw init.returnFailure;
            }

            return { done: true, value: undefined };
        },
    };

    return {
        client: {
            commandService: {
                submitAndWaitForTransactionAsync: async (request: SubmitCommandRequest, optionsArg?: RequestOptions) => {
                    trace.push("submit"); options.push(requireOptions(optionsArg));

                    if (init.submitFailure !== undefined) {
                        throw init.submitFailure;
                    }

                    return { transactionId: "update-1", events: [{ event: { oneofKind: "created", created: { contractId: "#message" } } }] };
                },
            },
            stateService: {
                getLedgerEndAsync: async (_request: unknown, optionsArg?: RequestOptions) => {
                    trace.push("ledger-end"); options.push(requireOptions(optionsArg));

                    return ledgerApiV2.GetLedgerEndResponse.create({ offset: init.ledgerEnd ?? "42" });
                },
            },
            updateService: {
                getUpdatesAsync: (request: ledgerApiV2.GetUpdatesRequest, optionsArg?: RequestOptions) => {
                    trace.push("stream"); init.updateRequests?.push(request); options.push(requireOptions(optionsArg));

                    return { [Symbol.asyncIterator]: () => iterator };
                },
                getUpdateByIdAsync: async (request: ledgerApiV2.GetUpdateByIdRequest, optionsArg?: RequestOptions) => {
                    trace.push("lookup-id"); init.byIdRequests?.push(request); options.push(requireOptions(optionsArg));

                    if (init.lookupFailure !== undefined) {
                        throw init.lookupFailure;
                    }

                    return lookupResponse();
                },
                getUpdateByOffsetAsync: async (request: ledgerApiV2.GetUpdateByOffsetRequest, optionsArg?: RequestOptions) => {
                    trace.push("lookup-offset"); init.byOffsetRequests?.push(request); options.push(requireOptions(optionsArg));

                    return lookupResponse();
                },
            },
        } as unknown as CantonClient,
        loadFixtureAsync: async () => {
            trace.push("fixture");

            return fixture();
        },
        ensureDarUploadedAsync: async (_client, _fixture, deadline) => {
            trace.push("dar"); options.push(deadline.createRequestOptions());

            return { alreadyInstalled: true };
        },
        resolvePartyAsync: async (_client, _environment, deadline) => {
            trace.push("party"); options.push(deadline.createRequestOptions());

            return { party: "Alice", allocated: false };
        },
        readCompatibilityAsync: async (_client, deadline) => {
            trace.push("compatibility"); options.push(deadline.createRequestOptions());

            return { participantVersion: "3.5.8-SNAPSHOT", releaseCore: "3.5.8", path: "common", acceptedGrpcCodes: { invalidChoice: [], duplicateCommand: [], staleContract: [] } };
        },
        createDeadline: init => {
            trace.push("deadline");

            return new OperationDeadline({ timeoutMs: init.timeoutMs, now: () => now++ });
        },
        timeoutMs: () => 100,
        createRunId: () => "run-123",
        logger: { log: message => init.logs?.push(message), warn: () => undefined },
    };
}

function fixture() {
    return { darBytes: new Uint8Array(), mainPackageId: "package-id", packageIds: ["package-id"], templateId: { packageId: "package-id", packageName: "package-name", moduleName: "DebugPlayground", entityName: "Message" } };
}

function matchingResponse(): ledgerApiV2.GetUpdatesResponse {
    return ledgerApiV2.GetUpdatesResponse.create({ update: { oneofKind: "transaction", transaction: transaction() } });
}

function unrelatedResponse(): ledgerApiV2.GetUpdatesResponse {
    return ledgerApiV2.GetUpdatesResponse.create({ update: { oneofKind: "reassignment", reassignment: ledgerApiV2.Reassignment.create() } });
}

function lookupResponse(): ledgerApiV2.GetUpdateResponse {
    return ledgerApiV2.GetUpdateResponse.create({ update: { oneofKind: "transaction", transaction: transaction() } });
}

function transaction(): ledgerApiV2.Transaction {
    return ledgerApiV2.Transaction.create({
        updateId: "update-1", offset: "43", synchronizerId: "sync-1", commandId: "update-lookup-reconciliation-run-123",
        events: [ledgerApiV2.Event.create({ event: { oneofKind: "created", created: ledgerApiV2.CreatedEvent.create({ contractId: "#message", templateId: ledgerApiV2.Identifier.create({ packageId: "package-id", moduleName: "DebugPlayground", entityName: "Message" }), packageName: "package-name", createArguments: ledgerApiV2.Record.create({ fields: [
            { label: "sender", value: ledgerApiV2.Value.create({ sum: { oneofKind: "party", party: "Alice" } }) },
            { label: "recipient", value: ledgerApiV2.Value.create({ sum: { oneofKind: "party", party: "Alice" } }) },
            { label: "text", value: ledgerApiV2.Value.create({ sum: { oneofKind: "text", text: "update-lookup-reconciliation-run-123" } }) },
        ] }), witnessParties: ["Alice"], signatories: ["Alice"], observers: [] }) } })],
    });
}

function requireOptions(options: RequestOptions | undefined): RequestOptions {
    if (options === undefined) {
        throw new Error("Expected request options.");
    }

    return options;
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
        throw new Error("Expected a normalized deadline-exceeded test error.");
    }

    return parsed;
}
