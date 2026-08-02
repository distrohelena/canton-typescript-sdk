import { ledgerApiV2 } from "@distrohelena/canton-typescript-sdk/protobuf";
import {
    OperationDeadline,
    RequestOptions,
    TimeoutError,
} from "@distrohelena/canton-typescript-sdk";
import {
    assertExactCreatedMessagePayload,
    type ExampleTemplateId,
} from "./application-fixture.js";

export const EVENT_QUERY_PROJECTION_POLL_INTERVAL_MS = 100;

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

    assertCreatedHistoryWrapper({
        created,
        originalContractId: init.originalContractId,
        party: init.party,
        templateId: init.templateId,
        text: init.text,
    });
    assertArchivedHistoryWrapper({
        archived,
        originalContractId: init.originalContractId,
        party: init.party,
        templateId: init.templateId,
    });

    return { created, archived };
}

export async function waitForCompleteOriginalHistoryAsync(init: {
    request: ledgerApiV2.GetEventsByContractIdRequest;
    deadline: OperationDeadline;
    readHistoryAsync: (
        request: ledgerApiV2.GetEventsByContractIdRequest,
        options: RequestOptions,
    ) => Promise<ledgerApiV2.GetEventsByContractIdResponse>;
    sleepAsync: (milliseconds: number) => Promise<void>;
    contractId: string;
    replacementContractId: string;
    party: string;
    templateId: ExampleTemplateId;
    text: string;
}): Promise<ledgerApiV2.GetEventsByContractIdResponse> {
    let attempts = 0;

    let missing = ["created", "archived"];

    for (;;) {
        let options: RequestOptions;

        try {
            options = init.deadline.createRequestOptions();
        } catch (error) {
            throwProjectionTimeout(error, init, attempts, missing);
        }

        attempts += 1;

        const response = await init.readHistoryAsync(init.request, options);

        if (response.created !== undefined) {
            assertCreatedHistoryWrapper({
                created: response.created,
                originalContractId: init.contractId,
                party: init.party,
                templateId: init.templateId,
                text: init.text,
            });
        }

        if (response.archived !== undefined) {
            assertArchivedHistoryWrapper({
                archived: response.archived,
                originalContractId: init.contractId,
                party: init.party,
                templateId: init.templateId,
            });
        }

        if (response.created !== undefined && response.archived !== undefined) {
            assertArchivedMessageHistory({
                response,
                originalContractId: init.contractId,
                party: init.party,
                templateId: init.templateId,
                text: init.text,
            });

            return response;
        }

        missing = [
            ...(response.created === undefined ? ["created"] : []),
            ...(response.archived === undefined ? ["archived"] : []),
        ];

        let remainingTimeoutMs: number;

        try {
            remainingTimeoutMs = init.deadline.remainingTimeoutMs();
        } catch (error) {
            throwProjectionTimeout(error, init, attempts, missing);
        }

        await init.sleepAsync(Math.min(
            EVENT_QUERY_PROJECTION_POLL_INTERVAL_MS,
            remainingTimeoutMs,
        ));
    }
}

function assertCreatedHistoryWrapper(init: {
    readonly created: ledgerApiV2.Created;
    readonly originalContractId: string;
    readonly party: string;
    readonly templateId: ExampleTemplateId;
    readonly text: string;
}): void {
    requireNonEmpty("original contract ID", init.originalContractId);
    requireNonEmpty("party", init.party);
    requireTemplateId(init.templateId);
    requireNonEmpty("created synchronizer ID", init.created.synchronizerId);

    if (init.created.createdEvent === undefined) {
        throw new Error("The created contract history wrapper must contain an event.");
    }

    assertExactCreatedMessage({
        event: init.created.createdEvent,
        contractId: init.originalContractId,
        party: init.party,
        templateId: init.templateId,
        text: init.text,
    });
}

function assertArchivedHistoryWrapper(init: {
    readonly archived: ledgerApiV2.Archived;
    readonly originalContractId: string;
    readonly party: string;
    readonly templateId: ExampleTemplateId;
}): void {
    requireNonEmpty("original contract ID", init.originalContractId);
    requireNonEmpty("party", init.party);
    requireTemplateId(init.templateId);
    requireNonEmpty("archived synchronizer ID", init.archived.synchronizerId);

    if (init.archived.archivedEvent === undefined) {
        throw new Error("The archived contract history wrapper must contain an event.");
    }

    assertExactArchivedMessage({
        event: init.archived.archivedEvent,
        contractId: init.originalContractId,
        party: init.party,
        templateId: init.templateId,
    });
}

function throwProjectionTimeout(
    error: unknown,
    init: {
        readonly contractId: string;
        readonly replacementContractId: string;
    },
    attempts: number,
    missing: readonly string[],
): never {
    if (!(error instanceof TimeoutError)) {
        throw error;
    }

    throw new Error(
        `EventQuery projection timed out: attempts=${attempts}, missing=${missing.join("|")}, originalContractId=${init.contractId}, replacementContractId=${init.replacementContractId}`,
        { cause: error },
    );
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
