import { ledgerApiV2 } from "@distrohelena/canton-typescript-sdk/protobuf";
import {
    assertExactCreatedMessagePayload,
    type ExampleTemplateId,
} from "./application-fixture.js";

export function buildMessageLifecycleEventFormat(
    party: string,
    templateId: ExampleTemplateId,
): ledgerApiV2.EventFormat {
    requireNonEmpty("party", party);
    requireTemplateId(templateId);

    const identifier = ledgerApiV2.Identifier.create({
        packageId: templateId.packageId,
        moduleName: templateId.moduleName,
        entityName: templateId.entityName,
    });

    const templateFilter = ledgerApiV2.TemplateFilter.create({
        templateId: identifier,
        includeCreatedEventBlob: false,
    });

    const cumulativeFilter = ledgerApiV2.CumulativeFilter.create({
        identifierFilter: {
            oneofKind: "templateFilter",
            templateFilter,
        },
    });

    const filters = ledgerApiV2.Filters.create({
        cumulative: [cumulativeFilter],
    });

    return ledgerApiV2.EventFormat.create({
        filtersByParty: { [party]: filters },
        verbose: true,
    });
}

export function assertDirectMessageLookup(init: {
    readonly response: ledgerApiV2.GetContractResponse;
    readonly contractId: string;
    readonly party: string;
    readonly templateId: ExampleTemplateId;
    readonly text: string;
}): ledgerApiV2.CreatedEvent {
    requireNonEmpty("contract ID", init.contractId);
    requireNonEmpty("party", init.party);
    requireTemplateId(init.templateId);

    const createdEvent = init.response.createdEvent;

    if (createdEvent === undefined) {
        throw new Error("Direct contract lookup did not return a created event.");
    }

    assertExactCreatedMessage({
        event: createdEvent,
        contractId: init.contractId,
        party: init.party,
        templateId: init.templateId,
        text: init.text,
    });

    return createdEvent;
}

export function assertArchivedMessageHistory(init: {
    readonly response: ledgerApiV2.GetEventsByContractIdResponse;
    readonly originalContractId: string;
    readonly party: string;
    readonly templateId: ExampleTemplateId;
    readonly text: string;
}): {
    readonly created: ledgerApiV2.Created;
    readonly archived: ledgerApiV2.Archived;
} {
    requireNonEmpty("original contract ID", init.originalContractId);
    requireNonEmpty("party", init.party);
    requireTemplateId(init.templateId);

    const created = init.response.created;

    const archived = init.response.archived;

    if (created === undefined || archived === undefined) {
        throw new Error("Contract history must contain created and archived wrappers.");
    }

    requireNonEmpty("created synchronizer ID", created.synchronizerId);
    requireNonEmpty("archived synchronizer ID", archived.synchronizerId);

    if (created.createdEvent === undefined || archived.archivedEvent === undefined) {
        throw new Error("Contract history wrappers must contain their events.");
    }

    assertExactCreatedMessage({
        event: created.createdEvent,
        contractId: init.originalContractId,
        party: init.party,
        templateId: init.templateId,
        text: init.text,
    });

    assertExactArchivedMessage({
        event: archived.archivedEvent,
        contractId: init.originalContractId,
        party: init.party,
        templateId: init.templateId,
    });

    return { created, archived };
}

function assertExactCreatedMessage(init: {
    readonly event: ledgerApiV2.CreatedEvent;
    readonly contractId: string;
    readonly party: string;
    readonly templateId: ExampleTemplateId;
    readonly text: string;
}): void {
    assertExactContractId(init.event.contractId, init.contractId, "created");
    assertExactTemplateId(init.event.templateId, init.templateId, "created");
    assertExactCreatedMessagePayload({
        event: init.event,
        sender: init.party,
        recipient: init.party,
        text: init.text,
    });
    assertExactPartySet(init.event.witnessParties, init.party, "created witnesses");
    assertExactPartySet(init.event.signatories, init.party, "created signatories");
    assertExactPartySet(init.event.observers, undefined, "created observers");
}

function assertExactArchivedMessage(init: {
    readonly event: ledgerApiV2.ArchivedEvent;
    readonly contractId: string;
    readonly party: string;
    readonly templateId: ExampleTemplateId;
}): void {
    assertExactContractId(init.event.contractId, init.contractId, "archived");
    assertExactTemplateId(init.event.templateId, init.templateId, "archived");
    assertExactPartySet(init.event.witnessParties, init.party, "archived witnesses");
}

function assertExactContractId(
    actual: string,
    expected: string,
    eventKind: string,
): void {
    if (!actual.trim() || actual !== expected) {
        throw new Error(`The ${eventKind} event did not have the expected contract ID.`);
    }
}

function assertExactTemplateId(
    actual: ledgerApiV2.Identifier | undefined,
    expected: ExampleTemplateId,
    eventKind: string,
): void {
    if (
        actual === undefined
        || !actual.packageId.trim()
        || !actual.moduleName.trim()
        || !actual.entityName.trim()
        || actual.packageId !== expected.packageId
        || actual.moduleName !== expected.moduleName
        || actual.entityName !== expected.entityName
    ) {
        throw new Error(`The ${eventKind} event did not have the expected template ID.`);
    }
}

function assertExactPartySet(
    actual: readonly string[],
    expected: string | undefined,
    label: string,
): void {
    const expectedLength = expected === undefined ? 0 : 1;

    if (actual.length !== expectedLength || actual[0] !== expected) {
        throw new Error(`The ${label} did not have the expected visibility.`);
    }
}

function requireTemplateId(templateId: ExampleTemplateId): void {
    requireNonEmpty("template package ID", templateId.packageId);
    requireNonEmpty("template package name", templateId.packageName);
    requireNonEmpty("template module name", templateId.moduleName);
    requireNonEmpty("template entity name", templateId.entityName);
}

function requireNonEmpty(label: string, value: string): void {
    if (!value.trim()) {
        throw new Error(`${label} must not be empty.`);
    }
}
