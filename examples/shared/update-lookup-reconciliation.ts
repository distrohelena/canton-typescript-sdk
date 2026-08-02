import { ledgerApiV2 } from "@distrohelena/canton-typescript-sdk/protobuf";
import {
    assertExactCreatedMessagePayload,
    type ExampleTemplateId,
} from "./application-fixture.js";

export interface CapturedMessageTransaction {
    readonly transaction: ledgerApiV2.Transaction;
    readonly createdEvent: ledgerApiV2.CreatedEvent;
    readonly updateId: string;
    readonly offset: string;
    readonly synchronizerId: string;
    readonly commandId: string;
    readonly contractId: string;
    readonly party: string;
    readonly templateId: ExampleTemplateId;
    readonly text: string;
}

export function captureExactMessageTransaction(init: {
    readonly response: unknown;
    readonly contractId: string;
    readonly party: string;
    readonly templateId: ExampleTemplateId;
    readonly text: string;
    readonly commandId: string;
}): CapturedMessageTransaction | undefined {
    requireNonEmpty("contract ID", init.contractId);
    requireNonEmpty("party", init.party);
    requireTemplateId(init.templateId);
    requireNonEmpty("Message text", init.text);
    requireNonEmpty("command ID", init.commandId);

    if (
        !ledgerApiV2.GetUpdatesResponse.is(init.response)
        || init.response.update.oneofKind !== "transaction"
        || !ledgerApiV2.Transaction.is(init.response.update.transaction)
    ) {
        return undefined;
    }

    const transaction = init.response.update.transaction;

    const matchingCreatedEvents = transaction.events.flatMap(event => {
        if (
            !ledgerApiV2.Event.is(event)
            || event.event.oneofKind !== "created"
            || !ledgerApiV2.CreatedEvent.is(event.event.created)
            || event.event.created.contractId !== init.contractId
        ) {
            return [];
        }

        return [event.event.created];
    });

    if (matchingCreatedEvents.length === 0) {
        return undefined;
    }

    assertExactMessageTransaction({
        transaction,
        expected: {
            updateId: undefined,
            offset: undefined,
            synchronizerId: undefined,
            commandId: init.commandId,
            contractId: init.contractId,
            party: init.party,
            templateId: init.templateId,
            text: init.text,
        },
    });

    return {
        transaction,
        createdEvent: matchingCreatedEvents[0]!,
        updateId: transaction.updateId,
        offset: transaction.offset,
        synchronizerId: transaction.synchronizerId,
        commandId: transaction.commandId,
        contractId: init.contractId,
        party: init.party,
        templateId: init.templateId,
        text: init.text,
    };
}

export function assertUpdateLookupMatchesCapturedMessageTransaction(init: {
    readonly response: unknown;
    readonly captured: CapturedMessageTransaction;
}): ledgerApiV2.Transaction {
    if (
        !ledgerApiV2.GetUpdateResponse.is(init.response)
        || init.response.update.oneofKind !== "transaction"
        || !ledgerApiV2.Transaction.is(init.response.update.transaction)
    ) {
        throw new Error("Update lookup did not return a transaction.");
    }

    const transaction = init.response.update.transaction;

    assertExactMessageTransaction({
        transaction,
        expected: init.captured,
    });

    return transaction;
}

function assertExactMessageTransaction(init: {
    readonly transaction: ledgerApiV2.Transaction;
    readonly expected: {
        readonly updateId: string | undefined;
        readonly offset: string | undefined;
        readonly synchronizerId: string | undefined;
        readonly commandId: string;
        readonly contractId: string;
        readonly party: string;
        readonly templateId: ExampleTemplateId;
        readonly text: string;
    };
}): void {
    const { transaction, expected } = init;

    requireNonEmpty("transaction update ID", transaction.updateId);
    requireNonEmpty("transaction offset", transaction.offset);
    requireNonEmpty("transaction synchronizer ID", transaction.synchronizerId);

    if (transaction.commandId !== expected.commandId) {
        throw new Error("The transaction did not have the expected command ID.");
    } else if (
        (expected.updateId !== undefined && transaction.updateId !== expected.updateId)
        || (expected.offset !== undefined && transaction.offset !== expected.offset)
        || (
            expected.synchronizerId !== undefined
            && transaction.synchronizerId !== expected.synchronizerId
        )
    ) {
        throw new Error("The update lookup did not match the streamed transaction identity.");
    } else if (transaction.events.length !== 1) {
        throw new Error("The transaction must contain exactly one created Message event.");
    }

    const event = transaction.events[0];

    if (
        !ledgerApiV2.Event.is(event)
        || event.event.oneofKind !== "created"
        || !ledgerApiV2.CreatedEvent.is(event.event.created)
    ) {
        throw new Error("The transaction did not contain a created Message event.");
    }

    assertExactCreatedMessage({
        event: event.event.created,
        contractId: expected.contractId,
        party: expected.party,
        templateId: expected.templateId,
        text: expected.text,
    });
}

function assertExactCreatedMessage(init: {
    readonly event: ledgerApiV2.CreatedEvent;
    readonly contractId: string;
    readonly party: string;
    readonly templateId: ExampleTemplateId;
    readonly text: string;
}): void {
    if (!init.event.contractId.trim() || init.event.contractId !== init.contractId) {
        throw new Error("The created event did not have the expected contract ID.");
    }

    const actualTemplateId = init.event.templateId;

    if (
        actualTemplateId === undefined
        || !actualTemplateId.packageId.trim()
        || !actualTemplateId.moduleName.trim()
        || !actualTemplateId.entityName.trim()
        || actualTemplateId.packageId !== init.templateId.packageId
        || actualTemplateId.moduleName !== init.templateId.moduleName
        || actualTemplateId.entityName !== init.templateId.entityName
        || init.event.packageName !== init.templateId.packageName
    ) {
        throw new Error("The created event did not have the expected Message template.");
    }

    assertExactCreatedMessagePayload({
        event: init.event,
        sender: init.party,
        recipient: init.party,
        text: init.text,
        requireFieldLabels: true,
    });
    assertExactPartySet(init.event.witnessParties, init.party, "created witnesses");
    assertExactPartySet(init.event.signatories, init.party, "created signatories");
    assertExactPartySet(init.event.observers, undefined, "created observers");
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
