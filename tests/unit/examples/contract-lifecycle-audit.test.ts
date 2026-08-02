import { google, ledgerApiV2 } from "@distrohelena/canton-typescript-sdk/protobuf";
import { describe, expect, it } from "vitest";
import type { ExampleTemplateId } from "../../../examples/shared/application-fixture.js";
import {
    assertArchivedMessageHistory,
    assertDirectMessageLookup,
    buildMessageLifecycleEventFormat,
} from "../../../examples/shared/contract-lifecycle-audit.js";

const party = "Alice::audit";

const templateId: ExampleTemplateId = {
    packageId: "package-id",
    packageName: "package-name",
    moduleName: "DebugPlayground",
    entityName: "Message",
};

const contractId = "#message-contract";

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
