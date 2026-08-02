import {
    OperationDeadline,
    RequestOptions,
    TimeoutError,
} from "@distrohelena/canton-typescript-sdk";
import { google, ledgerApiV2 } from "@distrohelena/canton-typescript-sdk/protobuf";
import { describe, expect, it, vi } from "vitest";
import type { ExampleTemplateId } from "../../../examples/shared/application-fixture.js";
import {
    assertArchivedMessageHistory,
    assertDirectMessageLookup,
    buildMessageLifecycleEventFormat,
    EVENT_QUERY_PROJECTION_POLL_INTERVAL_MS,
    waitForCompleteOriginalHistoryAsync,
} from "../../../examples/shared/contract-lifecycle-audit.js";

const party = "Alice::audit";

const templateId: ExampleTemplateId = {
    packageId: "package-id",
    packageName: "package-name",
    moduleName: "DebugPlayground",
    entityName: "Message",
};

const contractId = "#message-contract";

const originalContractId = "#original";

const replacementContractId = "#replacement";

const text = "lifecycle audit";

function createIdentifier(
    overrides: Partial<ledgerApiV2.Identifier> = {},
): ledgerApiV2.Identifier {
    return ledgerApiV2.Identifier.create({
        packageId: templateId.packageId,
        moduleName: templateId.moduleName,
        entityName: templateId.entityName,
        ...overrides,
    });
}

function createMessageArguments(
    overrides: Partial<ledgerApiV2.Record> = {},
): ledgerApiV2.Record {
    return ledgerApiV2.Record.create({
        fields: [
            {
                label: "sender",
                value: ledgerApiV2.Value.create({
                    sum: { oneofKind: "party", party },
                }),
            },
            {
                label: "recipient",
                value: ledgerApiV2.Value.create({
                    sum: { oneofKind: "party", party },
                }),
            },
            {
                label: "text",
                value: ledgerApiV2.Value.create({
                    sum: { oneofKind: "text", text },
                }),
            },
        ],
        ...overrides,
    });
}

function createExactMessageArguments(init: {
    readonly sender?: string;
    readonly recipient?: string;
    readonly text?: string;
    readonly senderValue?: ledgerApiV2.Value;
    readonly recipientValue?: ledgerApiV2.Value;
} = {}): ledgerApiV2.Record {
    return ledgerApiV2.Record.create({
        fields: [
            {
                label: "sender",
                value: init.senderValue ?? ledgerApiV2.Value.create({
                    sum: { oneofKind: "party", party: init.sender ?? party },
                }),
            },
            {
                label: "recipient",
                value: init.recipientValue ?? ledgerApiV2.Value.create({
                    sum: { oneofKind: "party", party: init.recipient ?? party },
                }),
            },
            {
                label: "text",
                value: ledgerApiV2.Value.create({
                    sum: { oneofKind: "text", text: init.text ?? text },
                }),
            },
        ],
    });
}

function createCreatedEvent(
    overrides: Partial<ledgerApiV2.CreatedEvent> = {},
): ledgerApiV2.CreatedEvent {
    return ledgerApiV2.CreatedEvent.create({
        contractId,
        templateId: createIdentifier(),
        createArguments: createMessageArguments(),
        witnessParties: [party],
        signatories: [party],
        observers: [],
        ...overrides,
    });
}

function createArchivedEvent(
    overrides: Partial<ledgerApiV2.ArchivedEvent> = {},
): ledgerApiV2.ArchivedEvent {
    return ledgerApiV2.ArchivedEvent.create({
        contractId,
        templateId: createIdentifier(),
        witnessParties: [party],
        ...overrides,
    });
}

function createHistoryResponse(init: {
    readonly created?: ledgerApiV2.Created;
    readonly archived?: ledgerApiV2.Archived;
} = {}): ledgerApiV2.GetEventsByContractIdResponse {
    return ledgerApiV2.GetEventsByContractIdResponse.create({
        created: init.created ?? ledgerApiV2.Created.create({
            createdEvent: createCreatedEvent(),
            synchronizerId: "synchronizer-created",
        }),
        archived: init.archived ?? ledgerApiV2.Archived.create({
            archivedEvent: createArchivedEvent(),
            synchronizerId: "synchronizer-archived",
        }),
    });
}

function createOriginalHistoryResponse(init: {
    readonly created?: ledgerApiV2.Created;
    readonly archived?: ledgerApiV2.Archived;
} = {}): ledgerApiV2.GetEventsByContractIdResponse {
    return ledgerApiV2.GetEventsByContractIdResponse.create({
        created: init.created ?? ledgerApiV2.Created.create({
            createdEvent: createCreatedEvent({ contractId: originalContractId }),
            synchronizerId: "synchronizer-created",
        }),
        archived: init.archived ?? ledgerApiV2.Archived.create({
            archivedEvent: createArchivedEvent({ contractId: originalContractId }),
            synchronizerId: "synchronizer-archived",
        }),
    });
}

function createOriginalHistoryRequest(): ledgerApiV2.GetEventsByContractIdRequest {
    return ledgerApiV2.GetEventsByContractIdRequest.create({
        contractId: originalContractId,
        eventFormat: buildMessageLifecycleEventFormat(party, templateId),
    });
}

describe("buildMessageLifecycleEventFormat", () => {
    it("builds the exact party-scoped Message template format", () => {
        const format = buildMessageLifecycleEventFormat(party, templateId);

        expect(ledgerApiV2.EventFormat.is(format)).toBe(true);
        expect(format.filtersForAnyParty).toBeUndefined();
        expect(format.verbose).toBe(true);
        expect(Object.keys(format.filtersByParty)).toEqual([party]);

        const filters = format.filtersByParty[party];

        expect(ledgerApiV2.Filters.is(filters)).toBe(true);
        expect(filters?.cumulative).toHaveLength(1);

        const cumulative = filters?.cumulative[0];

        expect(ledgerApiV2.CumulativeFilter.is(cumulative)).toBe(true);
        expect(cumulative?.identifierFilter.oneofKind).toBe("templateFilter");

        const templateFilter = cumulative?.identifierFilter.templateFilter;

        expect(ledgerApiV2.TemplateFilter.is(templateFilter)).toBe(true);
        expect(templateFilter?.includeCreatedEventBlob).toBe(false);
        expect(ledgerApiV2.Identifier.is(templateFilter?.templateId)).toBe(true);
        expect(templateFilter?.templateId).toEqual(createIdentifier());
        expect(templateFilter?.templateId?.packageId).toBe(templateId.packageId);
        expect(templateFilter?.templateId?.packageId).not.toBe(
            `#${templateId.packageName}`,
        );
    });

    it.each([
        ["party", " ", templateId],
        ["package ID", party, { ...templateId, packageId: " " }],
        ["package name", party, { ...templateId, packageName: " " }],
        ["module name", party, { ...templateId, moduleName: " " }],
        ["entity name", party, { ...templateId, entityName: " " }],
    ] as const)("rejects a blank %s", (_label, invalidParty, invalidTemplateId) => {
        expect(() =>
            buildMessageLifecycleEventFormat(invalidParty, invalidTemplateId),
        ).toThrow(/must not be empty/i);
    });
});

describe("assertDirectMessageLookup", () => {
    it("accepts a materialized exact Message while ignoring ContractService-unavailable fields", () => {
        const createdEvent = createCreatedEvent({
            offset: "42",
            nodeId: 7,
            createdEventBlob: Uint8Array.of(1, 2),
            interfaceViews: [ledgerApiV2.InterfaceView.create({
                interfaceId: ledgerApiV2.Identifier.create({
                    packageId: "interface-package",
                    moduleName: "Fixture",
                    entityName: "View",
                }),
                viewStatus: google.rpc.Status.create({
                    code: 0,
                    message: "fixture interface view",
                }),
                implementationPackageId: "interface-package",
            })],
            acsDelta: true,
        });

        const response = ledgerApiV2.GetContractResponse.create({ createdEvent });

        const result = assertDirectMessageLookup({
            response,
            contractId,
            party,
            templateId,
            text,
        });

        expect(result).toBe(response.createdEvent);
    });

    it.each([
        ["absent created event", ledgerApiV2.GetContractResponse.create({})],
        [
            "wrong contract ID",
            ledgerApiV2.GetContractResponse.create({
                createdEvent: createCreatedEvent({ contractId: "#other" }),
            }),
        ],
        [
            "blank contract ID",
            ledgerApiV2.GetContractResponse.create({
                createdEvent: createCreatedEvent({ contractId: " " }),
            }),
        ],
        [
            "wrong template",
            ledgerApiV2.GetContractResponse.create({
                createdEvent: createCreatedEvent({
                    templateId: createIdentifier({ entityName: "Other" }),
                }),
            }),
        ],
        [
            "blank template component",
            ledgerApiV2.GetContractResponse.create({
                createdEvent: createCreatedEvent({
                    templateId: createIdentifier({ moduleName: " " }),
                }),
            }),
        ],
        [
            "missing template ID",
            ledgerApiV2.GetContractResponse.create({
                createdEvent: createCreatedEvent({ templateId: undefined }),
            }),
        ],
        [
            "wrong payload",
            ledgerApiV2.GetContractResponse.create({
                createdEvent: createCreatedEvent({
                    createArguments: createMessageArguments({
                        fields: [{
                            label: "sender",
                            value: ledgerApiV2.Value.create({
                                sum: { oneofKind: "party", party },
                            }),
                        }],
                    }),
                }),
            }),
        ],
        [
            "wrong payload field value",
            ledgerApiV2.GetContractResponse.create({
                createdEvent: createCreatedEvent({
                    createArguments: ledgerApiV2.Record.create({
                        fields: [
                            {
                                label: "sender",
                                value: ledgerApiV2.Value.create({
                                    sum: { oneofKind: "party", party },
                                }),
                            },
                            {
                                label: "recipient",
                                value: ledgerApiV2.Value.create({
                                    sum: { oneofKind: "party", party },
                                }),
                            },
                            {
                                label: "text",
                                value: ledgerApiV2.Value.create({
                                    sum: { oneofKind: "text", text: "other" },
                                }),
                            },
                        ],
                    }),
                }),
            }),
        ],
        [
            "wrong sender",
            ledgerApiV2.GetContractResponse.create({
                createdEvent: createCreatedEvent({
                    createArguments: createExactMessageArguments({
                        senderValue: ledgerApiV2.Value.create({
                            sum: { oneofKind: "text", text: party },
                        }),
                    }),
                }),
            }),
        ],
        [
            "wrong recipient",
            ledgerApiV2.GetContractResponse.create({
                createdEvent: createCreatedEvent({
                    createArguments: createExactMessageArguments({
                        recipientValue: ledgerApiV2.Value.create({
                            sum: { oneofKind: "text", text: party },
                        }),
                    }),
                }),
            }),
        ],
    ] as const)("rejects %s", (_label, response) => {
        expect(() =>
            assertDirectMessageLookup({
                response,
                contractId,
                party,
                templateId,
                text,
            }),
        ).toThrow();
    });

    it.each([
        ["missing witnesses", createCreatedEvent({ witnessParties: [] })],
        [
            "wrong-party witnesses",
            createCreatedEvent({ witnessParties: ["Bob::audit"] }),
        ],
        ["duplicate witnesses", createCreatedEvent({ witnessParties: [party, party] })],
        ["missing signatories", createCreatedEvent({ signatories: [] })],
        [
            "wrong-party signatories",
            createCreatedEvent({ signatories: ["Bob::audit"] }),
        ],
        ["duplicate signatories", createCreatedEvent({ signatories: [party, party] })],
        ["wrong-party observers", createCreatedEvent({ observers: ["Bob::audit"] })],
        ["duplicate observers", createCreatedEvent({ observers: [party, party] })],
        ["nonempty observers", createCreatedEvent({ observers: [party] })],
    ] as const)("rejects non-exact %s visibility", (_label, createdEvent) => {
        expect(() =>
            assertDirectMessageLookup({
                response: ledgerApiV2.GetContractResponse.create({ createdEvent }),
                contractId,
                party,
                templateId,
                text,
            }),
        ).toThrow(/visibility/i);
    });
});

describe("assertArchivedMessageHistory", () => {
    it("returns the exact created and archived history wrappers", () => {
        const response = createHistoryResponse();

        const result = assertArchivedMessageHistory({
            response,
            originalContractId: contractId,
            party,
            templateId,
            text,
        });

        expect(result).toEqual({
            created: response.created,
            archived: response.archived,
        });
    });

    it.each([
        [
            "missing created wrapper",
            ledgerApiV2.GetEventsByContractIdResponse.create({
                archived: ledgerApiV2.Archived.create({
                    archivedEvent: createArchivedEvent(),
                    synchronizerId: "synchronizer-archived",
                }),
            }),
        ],
        [
            "missing archived wrapper",
            ledgerApiV2.GetEventsByContractIdResponse.create({
                created: ledgerApiV2.Created.create({
                    createdEvent: createCreatedEvent(),
                    synchronizerId: "synchronizer-created",
                }),
            }),
        ],
        [
            "missing created inner event",
            createHistoryResponse({
                created: ledgerApiV2.Created.create({
                    synchronizerId: "synchronizer-created",
                }),
            }),
        ],
        [
            "missing archived inner event",
            createHistoryResponse({
                archived: ledgerApiV2.Archived.create({
                    synchronizerId: "synchronizer-archived",
                }),
            }),
        ],
        [
            "blank created synchronizer",
            createHistoryResponse({
                created: ledgerApiV2.Created.create({
                    createdEvent: createCreatedEvent(),
                    synchronizerId: " ",
                }),
            }),
        ],
        [
            "blank archived synchronizer",
            createHistoryResponse({
                archived: ledgerApiV2.Archived.create({
                    archivedEvent: createArchivedEvent(),
                    synchronizerId: " ",
                }),
            }),
        ],
        [
            "replacement archived ID",
            createHistoryResponse({
                archived: ledgerApiV2.Archived.create({
                    archivedEvent: createArchivedEvent({ contractId: "#replacement" }),
                    synchronizerId: "synchronizer-archived",
                }),
            }),
        ],
        [
            "wrong created template",
            createHistoryResponse({
                created: ledgerApiV2.Created.create({
                    createdEvent: createCreatedEvent({
                        templateId: createIdentifier({ packageId: "other-package" }),
                    }),
                    synchronizerId: "synchronizer-created",
                }),
            }),
        ],
        [
            "wrong created payload",
            createHistoryResponse({
                created: ledgerApiV2.Created.create({
                    createdEvent: createCreatedEvent({
                        createArguments: createMessageArguments({ fields: [] }),
                    }),
                    synchronizerId: "synchronizer-created",
                }),
            }),
        ],
        [
            "wrong created visibility",
            createHistoryResponse({
                created: ledgerApiV2.Created.create({
                    createdEvent: createCreatedEvent({ witnessParties: [] }),
                    synchronizerId: "synchronizer-created",
                }),
            }),
        ],
        [
            "wrong created signatories",
            createHistoryResponse({
                created: ledgerApiV2.Created.create({
                    createdEvent: createCreatedEvent({ signatories: ["Bob::audit"] }),
                    synchronizerId: "synchronizer-created",
                }),
            }),
        ],
        [
            "wrong created observers",
            createHistoryResponse({
                created: ledgerApiV2.Created.create({
                    createdEvent: createCreatedEvent({ observers: [party] }),
                    synchronizerId: "synchronizer-created",
                }),
            }),
        ],
        [
            "wrong archived template",
            createHistoryResponse({
                archived: ledgerApiV2.Archived.create({
                    archivedEvent: createArchivedEvent({
                        templateId: createIdentifier({ moduleName: "Other" }),
                    }),
                    synchronizerId: "synchronizer-archived",
                }),
            }),
        ],
        [
            "missing archived witnesses",
            createHistoryResponse({
                archived: ledgerApiV2.Archived.create({
                    archivedEvent: createArchivedEvent({ witnessParties: [] }),
                    synchronizerId: "synchronizer-archived",
                }),
            }),
        ],
        [
            "wrong-party archived witnesses",
            createHistoryResponse({
                archived: ledgerApiV2.Archived.create({
                    archivedEvent: createArchivedEvent({ witnessParties: ["Bob::audit"] }),
                    synchronizerId: "synchronizer-archived",
                }),
            }),
        ],
        [
            "duplicate archived witnesses",
            createHistoryResponse({
                archived: ledgerApiV2.Archived.create({
                    archivedEvent: createArchivedEvent({ witnessParties: [party, party] }),
                    synchronizerId: "synchronizer-archived",
                }),
            }),
        ],
    ] as const)("rejects %s", (_label, response) => {
        expect(() =>
            assertArchivedMessageHistory({
                response,
                originalContractId: contractId,
                party,
                templateId,
                text,
            }),
        ).toThrow();
    });
});

describe("waitForCompleteOriginalHistoryAsync", () => {
    it("returns a complete first response after one read without sleeping", async () => {
        let now = 1_000;

        const request = createOriginalHistoryRequest();

        const response = createOriginalHistoryResponse();

        const reads: Array<{
            request: ledgerApiV2.GetEventsByContractIdRequest;
            options: RequestOptions;
        }> = [];

        const sleeps: number[] = [];

        const result = await waitForCompleteOriginalHistoryAsync({
            request,
            deadline: new OperationDeadline({ timeoutMs: 250, now: () => now }),
            readHistoryAsync: async (actualRequest, options) => {
                reads.push({ request: actualRequest, options });

                return response;
            },
            sleepAsync: async milliseconds => {
                sleeps.push(milliseconds);
                now += milliseconds;
            },
            contractId: originalContractId,
            replacementContractId,
            party,
            templateId,
            text,
        });

        expect(result).toBe(response);
        expect(reads).toHaveLength(1);
        expect(reads[0]?.request).toBe(request);
        expect(reads[0]?.options).toBeInstanceOf(RequestOptions);
        expect(reads[0]?.options.timeoutMs).toBe(250);
        expect(sleeps).toEqual([]);
    });

    it("retries a valid created-only projection with fresh shrinking options", async () => {
        let now = 1_000;

        const request = createOriginalHistoryRequest();

        const responses = [
            ledgerApiV2.GetEventsByContractIdResponse.create({
                created: ledgerApiV2.Created.create({
                    createdEvent: createCreatedEvent({ contractId: originalContractId }),
                    synchronizerId: "synchronizer-created",
                }),
            }),
            createOriginalHistoryResponse(),
        ];

        const reads: Array<{
            request: ledgerApiV2.GetEventsByContractIdRequest;
            options: RequestOptions;
        }> = [];

        const sleeps: number[] = [];

        const result = await waitForCompleteOriginalHistoryAsync({
            request,
            deadline: new OperationDeadline({ timeoutMs: 250, now: () => now }),
            readHistoryAsync: async (actualRequest, options) => {
                reads.push({ request: actualRequest, options });

                const response = responses.shift();

                if (response === undefined) {
                    throw new Error("unexpected additional EventQuery read");
                }

                return response;
            },
            sleepAsync: async milliseconds => {
                sleeps.push(milliseconds);
                now += milliseconds;
            },
            contractId: originalContractId,
            replacementContractId,
            party,
            templateId,
            text,
        });

        expect(result).toEqual(createOriginalHistoryResponse());
        expect(reads.map(read => read.request)).toEqual([request, request]);
        expect(reads[0]?.request).toBe(request);
        expect(reads[1]?.request).toBe(request);
        expect(reads[0]?.options).not.toBe(reads[1]?.options);
        expect(reads.map(read => read.options.timeoutMs)).toEqual([250, 150]);
        expect(sleeps).toEqual([EVENT_QUERY_PROJECTION_POLL_INTERVAL_MS]);
    });

    it("wraps an exhausted short-budget incomplete projection timeout without a second read", async () => {
        let now = 1_000;

        const reads: RequestOptions[] = [];

        const sleeps: number[] = [];

        const deadline = new OperationDeadline({ timeoutMs: 75, now: () => now });

        const actualCreateRequestOptions = deadline.createRequestOptions.bind(deadline);

        let timeout: TimeoutError | undefined;

        vi.spyOn(deadline, "createRequestOptions").mockImplementation(() => {
            try {
                return actualCreateRequestOptions();
            } catch (error) {
                if (error instanceof TimeoutError) {
                    timeout = error;
                }

                throw error;
            }
        });

        const pending = waitForCompleteOriginalHistoryAsync({
            request: createOriginalHistoryRequest(),
            deadline,
            readHistoryAsync: async (_request, options) => {
                reads.push(options);

                return ledgerApiV2.GetEventsByContractIdResponse.create({
                    created: ledgerApiV2.Created.create({
                        createdEvent: createCreatedEvent({ contractId: originalContractId }),
                        synchronizerId: "synchronizer-created",
                    }),
                });
            },
            sleepAsync: async milliseconds => {
                sleeps.push(milliseconds);
                now += milliseconds;
            },
            contractId: originalContractId,
            replacementContractId,
            party,
            templateId,
            text,
        });

        await expect(pending).rejects.toSatisfy((error: Error) => {
            expect(error).toBeInstanceOf(Error);
            expect(timeout).toBeInstanceOf(TimeoutError);
            expect(error.cause).toBe(timeout);
            expect(error.message).toContain("attempts=1");
            expect(error.message).toContain("missing=archived");
            expect(error.message).toContain(`originalContractId=${originalContractId}`);
            expect(error.message).toContain(`replacementContractId=${replacementContractId}`);

            return true;
        });
        expect(reads).toHaveLength(1);
        expect(sleeps).toEqual([75]);
    });

    it("reports expiry before dispatch with no EventQuery read", async () => {
        let now = 1_000;

        const deadline = new OperationDeadline({ timeoutMs: 100, now: () => now });

        now += 100;

        let reads = 0;

        const pending = waitForCompleteOriginalHistoryAsync({
            request: createOriginalHistoryRequest(),
            deadline,
            readHistoryAsync: async () => {
                reads += 1;

                return createOriginalHistoryResponse();
            },
            sleepAsync: async () => undefined,
            contractId: originalContractId,
            replacementContractId,
            party,
            templateId,
            text,
        });

        await expect(pending).rejects.toSatisfy((error: Error) => {
            expect(error.cause).toBeInstanceOf(TimeoutError);
            expect(error.message).toContain("attempts=0");
            expect(error.message).toContain("missing=created|archived");
            expect(error.message).toContain(`originalContractId=${originalContractId}`);
            expect(error.message).toContain(`replacementContractId=${replacementContractId}`);

            return true;
        });
        expect(reads).toBe(0);
    });

    it.each([
        [
            "a malformed present created wrapper",
            ledgerApiV2.GetEventsByContractIdResponse.create({
                created: ledgerApiV2.Created.create({
                    createdEvent: createCreatedEvent({ contractId: "#wrong" }),
                    synchronizerId: "synchronizer-created",
                }),
            }),
        ],
        [
            "a present created wrapper with a blank synchronizer",
            ledgerApiV2.GetEventsByContractIdResponse.create({
                created: ledgerApiV2.Created.create({
                    createdEvent: createCreatedEvent({ contractId: originalContractId }),
                    synchronizerId: " ",
                }),
            }),
        ],
        [
            "a malformed present archived wrapper",
            ledgerApiV2.GetEventsByContractIdResponse.create({
                archived: ledgerApiV2.Archived.create({
                    archivedEvent: createArchivedEvent({
                        contractId: originalContractId,
                        witnessParties: [],
                    }),
                    synchronizerId: "synchronizer-archived",
                }),
            }),
        ],
    ] as const)("rejects %s immediately without retrying", async (_description, response) => {
        let now = 1_000;

        let reads = 0;

        const sleeps: number[] = [];

        await expect(waitForCompleteOriginalHistoryAsync({
            request: createOriginalHistoryRequest(),
            deadline: new OperationDeadline({ timeoutMs: 250, now: () => now }),
            readHistoryAsync: async () => {
                reads += 1;

                return response;
            },
            sleepAsync: async milliseconds => {
                sleeps.push(milliseconds);
                now += milliseconds;
            },
            contractId: originalContractId,
            replacementContractId,
            party,
            templateId,
            text,
        })).rejects.toThrow();
        expect(reads).toBe(1);
        expect(sleeps).toEqual([]);
    });

    it("preserves a transport failure by identity without retrying", async () => {
        let now = 1_000;

        const failure = new Error("transport metadata: endpoint=https://example.invalid");

        let reads = 0;

        const sleeps: number[] = [];

        await expect(waitForCompleteOriginalHistoryAsync({
            request: createOriginalHistoryRequest(),
            deadline: new OperationDeadline({ timeoutMs: 250, now: () => now }),
            readHistoryAsync: async () => {
                reads += 1;

                throw failure;
            },
            sleepAsync: async milliseconds => {
                sleeps.push(milliseconds);
                now += milliseconds;
            },
            contractId: originalContractId,
            replacementContractId,
            party,
            templateId,
            text,
        })).rejects.toBe(failure);
        expect(reads).toBe(1);
        expect(sleeps).toEqual([]);
    });

    it("keeps projection-timeout diagnostics credential-safe", async () => {
        let now = 1_000;

        const sensitiveResponse = ledgerApiV2.GetEventsByContractIdResponse.create({
            created: ledgerApiV2.Created.create({
                createdEvent: createCreatedEvent({ contractId: originalContractId }),
                synchronizerId: "synchronizer-created",
            }),
        });

        const token = "Bearer secret-token-123";

        const endpoint = "https://participant.example.invalid";

        const header = "authorization: Bearer secret-token-123";

        const metadata = "grpc-metadata-secret-token-123";

        const pending = waitForCompleteOriginalHistoryAsync({
            request: createOriginalHistoryRequest(),
            deadline: new OperationDeadline({ timeoutMs: 100, now: () => now }),
            readHistoryAsync: async () => sensitiveResponse,
            sleepAsync: async milliseconds => {
                now += milliseconds;
            },
            contractId: originalContractId,
            replacementContractId,
            party,
            templateId,
            text,
        });

        await expect(pending).rejects.toSatisfy((error: Error) => {
            for (const forbidden of [
                party,
                text,
                token,
                endpoint,
                header,
                metadata,
                String(sensitiveResponse),
            ]) {
                expect(error.message).not.toContain(forbidden);
            }

            return true;
        });
    });
});
