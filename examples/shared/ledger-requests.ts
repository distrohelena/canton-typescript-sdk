import { ledgerApiV2 } from "@distrohelena/canton-typescript-sdk/protobuf";
import type { ExampleTemplateId } from "./application-fixture.js";
import {
    assertExactCreatedMessagePayload,
    readCreatedMessageText,
} from "./application-fixture.js";

export function buildActiveContractsRequest(init: {
    readonly party: string;
    readonly templateId: ExampleTemplateId;
}): ledgerApiV2.GetActiveContractsPageRequest {
    return ledgerApiV2.GetActiveContractsPageRequest.create({
        eventFormat: buildMessageEventFormat(init),
    });
}

export function buildUpdatesRequest(init: {
    readonly beginExclusive: string;
    readonly party: string;
    readonly templateId: ExampleTemplateId;
}): ledgerApiV2.GetUpdatesRequest {
    requireNonEmpty("begin exclusive offset", init.beginExclusive);

    return ledgerApiV2.GetUpdatesRequest.create({
        beginExclusive: init.beginExclusive,
        updateFormat: buildMessageUpdateFormat(init),
        descendingOrder: false,
    });
}

export function buildMessageUpdateFormat(init: {
    readonly party: string;
    readonly templateId: ExampleTemplateId;
}): ledgerApiV2.UpdateFormat {
    return ledgerApiV2.UpdateFormat.create({
        includeTransactions: ledgerApiV2.TransactionFormat.create({
            eventFormat: buildMessageEventFormat(init),
            transactionShape: ledgerApiV2.TransactionShape.ACS_DELTA,
        }),
    });
}

export function matchCreatedMessageUpdate(init: {
    readonly response: unknown;
    readonly contractId: string;
}):
    | { readonly updateId: string; readonly offset: string; readonly contractId: string }
    | undefined {
    if (
        !init.contractId.trim()
        || !ledgerApiV2.GetUpdatesResponse.is(init.response)
        || init.response.update.oneofKind !== "transaction"
        || !ledgerApiV2.Transaction.is(init.response.update.transaction)
    ) {
        return undefined;
    }

    const transaction = init.response.update.transaction;

    if (!transaction.updateId.trim() || !transaction.offset.trim()) {
        return undefined;
    }

    for (const event of transaction.events) {
        if (
            !ledgerApiV2.Event.is(event)
            || event.event.oneofKind !== "created"
            || !ledgerApiV2.CreatedEvent.is(event.event.created)
        ) {
            continue;
        }

        const createdContractId = event.event.created.contractId;

        if (
            !createdContractId.trim()
            || createdContractId !== init.contractId
        ) {
            continue;
        }

        return {
            updateId: transaction.updateId,
            offset: transaction.offset,
            contractId: createdContractId,
        };
    }

    return undefined;
}

export function findActiveMessage(
    activeContracts: readonly unknown[],
    contractId: string,
): ledgerApiV2.CreatedEvent | undefined {
    if (contractId.trim().length === 0) {
        return undefined;
    }

    for (const response of activeContracts) {
        if (!isRecord(response) || !isRecord(response.contractEntry)) {
            continue;
        }

        const contractEntry = response.contractEntry;

        if (
            contractEntry.oneofKind !== "activeContract"
            || !isRecord(contractEntry.activeContract)
        ) {
            continue;
        }

        const createdEvent = contractEntry.activeContract.createdEvent;

        if (
            !ledgerApiV2.CreatedEvent.is(createdEvent)
            || createdEvent.contractId.trim().length === 0
            || createdEvent.contractId !== contractId
        ) {
            continue;
        }

        return createdEvent;
    }

    return undefined;
}

export function assertExactlyOneActiveMessage(init: {
    readonly messages: readonly ledgerApiV2.CreatedEvent[];
    readonly textMarker: string;
}): ledgerApiV2.CreatedEvent {
    requireNonEmpty("Message text marker", init.textMarker);

    if (init.messages.length !== 1) {
        throw new Error(
            `Expected exactly one active Message with text marker '${init.textMarker}', found ${init.messages.length}.`,
        );
    }

    const message = init.messages[0]!;

    if (!message.contractId.trim()) {
        throw new Error("The active Message must have a non-empty contract ID.");
    } else if (readCreatedMessageText(message) !== init.textMarker) {
        throw new Error(
            `Active Message '${message.contractId}' did not contain text marker '${init.textMarker}'.`,
        );
    }

    return message;
}

export function assertAtomicMessageTerminalState(init: {
    readonly messages: readonly ledgerApiV2.CreatedEvent[];
    readonly initialText: string;
    readonly replacementText: string;
    readonly responseContractId: string;
    readonly party: string;
}): ledgerApiV2.CreatedEvent {
    requireNonEmpty("initial Message text", init.initialText);
    requireNonEmpty("replacement Message text", init.replacementText);
    requireNonEmpty("response contract ID", init.responseContractId);
    requireNonEmpty("actor party", init.party);

    const initialMessages = init.messages.filter(
        message => readCreatedMessageText(message) === init.initialText,
    );

    if (initialMessages.length !== 0) {
        throw new Error(
            `Expected the initial Message to be absent, but found ${initialMessages.length} active.`,
        );
    }

    const replacement = assertExactlyOneActiveMessage({
        messages: init.messages.filter(
            message => readCreatedMessageText(message) === init.replacementText,
        ),
        textMarker: init.replacementText,
    });

    if (replacement.contractId !== init.responseContractId) {
        throw new Error(
            "The active replacement did not match the response created contract ID.",
        );
    }

    assertExactCreatedMessagePayload({
        event: replacement,
        sender: init.party,
        recipient: init.party,
        text: init.replacementText,
    });

    return replacement;
}

export function extractTwoCreatedContractIds(response: {
    readonly events: readonly unknown[];
}): readonly [string, string] {
    const contractIds: string[] = [];

    for (const responseEvent of response.events) {
        if (!isRecord(responseEvent) || !isRecord(responseEvent.event)) {
            continue;
        }

        const event = responseEvent.event;

        if (
            event.oneofKind !== "created"
            || !isRecord(event.created)
            || typeof event.created.contractId !== "string"
            || !event.created.contractId.trim()
        ) {
            continue;
        }

        contractIds.push(event.created.contractId);
    }

    if (contractIds.length !== 2) {
        throw new Error(
            `Expected exactly two created events with non-empty contract IDs in the atomic batch response, found ${contractIds.length}.`,
        );
    } else if (contractIds[0] === contractIds[1]) {
        throw new Error(
            "The atomic batch response created contract IDs must be distinct.",
        );
    }

    return [contractIds[0]!, contractIds[1]!];
}

export function assertAtomicMessageBatchState(init: {
    readonly messages: readonly ledgerApiV2.CreatedEvent[];
    readonly invalidFirstText: string;
    readonly firstText: string;
    readonly secondText: string;
    readonly responseContractIds: readonly [string, string];
    readonly party: string;
    readonly templateId: ExampleTemplateId;
}): readonly [ledgerApiV2.CreatedEvent, ledgerApiV2.CreatedEvent] {
    requireNonEmpty("invalid first Message text", init.invalidFirstText);
    requireNonEmpty("first Message text", init.firstText);
    requireNonEmpty("second Message text", init.secondText);
    requireNonEmpty("first response created contract ID", init.responseContractIds[0]);
    requireNonEmpty("second response created contract ID", init.responseContractIds[1]);
    requireNonEmpty("actor party", init.party);

    if (init.responseContractIds[0] === init.responseContractIds[1]) {
        throw new Error("The response created contract IDs must be distinct.");
    }

    const invalidMessages = init.messages.filter(
        message => readCreatedMessageText(message) === init.invalidFirstText,
    );

    if (invalidMessages.length !== 0) {
        throw new Error(
            `Expected the rejected first Message to be absent, but found ${invalidMessages.length} active.`,
        );
    }

    const first = assertExactlyOneActiveMessage({
        messages: init.messages.filter(
            message => readCreatedMessageText(message) === init.firstText,
        ),
        textMarker: init.firstText,
    });

    const second = assertExactlyOneActiveMessage({
        messages: init.messages.filter(
            message => readCreatedMessageText(message) === init.secondText,
        ),
        textMarker: init.secondText,
    });

    const activeContractIds = new Set([first.contractId, second.contractId]);

    const responseContractIds = new Set(init.responseContractIds);

    if (
        activeContractIds.size !== 2
        || responseContractIds.size !== 2
        || activeContractIds.size !== responseContractIds.size
        || [...activeContractIds].some(contractId => !responseContractIds.has(contractId))
    ) {
        throw new Error(
            "The active Message contract IDs did not equal the response created contract IDs.",
        );
    }

    for (const [message, text] of [[first, init.firstText], [second, init.secondText]] as const) {
        assertExactMessageTemplate({ event: message, templateId: init.templateId });
        assertExactCreatedMessagePayload({
            event: message,
            sender: init.party,
            recipient: init.party,
            text,
        });
    }

    return [first, second];
}

export function assertMessageContractAbsent(init: {
    readonly messages: readonly ledgerApiV2.CreatedEvent[];
    readonly contractId: string;
}): void {
    requireNonEmpty("contract ID", init.contractId);

    if (init.messages.some(message => message.contractId === init.contractId)) {
        throw new Error(
            `Expected Message contract '${init.contractId}' to be absent, but it is still active.`,
        );
    }
}

function requireNonEmpty(label: string, value: string): void {
    if (!value.trim()) {
        throw new Error(`${label} must not be empty.`);
    }
}

function assertExactMessageTemplate(init: {
    readonly event: ledgerApiV2.CreatedEvent;
    readonly templateId: ExampleTemplateId;
}): void {
    const templateId = init.event.templateId;

    if (
        !ledgerApiV2.Identifier.is(templateId)
        || templateId.packageId !== init.templateId.packageId
        || templateId.moduleName !== init.templateId.moduleName
        || templateId.entityName !== init.templateId.entityName
    ) {
        throw new Error(
            `Active Message '${init.event.contractId}' did not match the expected template.`,
        );
    }
}

function buildMessageEventFormat(init: {
    readonly party: string;
    readonly templateId: ExampleTemplateId;
}): ledgerApiV2.EventFormat {
    requireNonEmpty("party", init.party);
    requireNonEmpty("template package ID", init.templateId.packageId);
    requireNonEmpty("template package name", init.templateId.packageName);
    requireNonEmpty("template module name", init.templateId.moduleName);
    requireNonEmpty("template entity name", init.templateId.entityName);

    return ledgerApiV2.EventFormat.create({
        filtersByParty: {
            [init.party]: ledgerApiV2.Filters.create({
                cumulative: [
                    ledgerApiV2.CumulativeFilter.create({
                        identifierFilter: {
                            oneofKind: "templateFilter",
                            templateFilter: ledgerApiV2.TemplateFilter.create({
                                templateId: ledgerApiV2.Identifier.create({
                                    packageId: `#${init.templateId.packageName}`,
                                    moduleName: init.templateId.moduleName,
                                    entityName: init.templateId.entityName,
                                }),
                                includeCreatedEventBlob: false,
                            }),
                        },
                    }),
                ],
            }),
        },
        verbose: true,
    });
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}
