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

    const eventFormat = buildMessageEventFormat(init);

    return ledgerApiV2.GetUpdatesRequest.create({
        beginExclusive: init.beginExclusive,
        updateFormat: ledgerApiV2.UpdateFormat.create({
            includeTransactions: ledgerApiV2.TransactionFormat.create({
                eventFormat,
                transactionShape: ledgerApiV2.TransactionShape.ACS_DELTA,
            }),
        }),
        descendingOrder: false,
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

export async function findActiveMessageAcrossPagesAsync(init: {
    readonly request: ledgerApiV2.GetActiveContractsPageRequest;
    readonly contractId: string;
    readonly timeoutMs: number;
    readonly readPageAsync: (
        request: ledgerApiV2.GetActiveContractsPageRequest,
        remainingTimeoutMs: number,
    ) => Promise<ledgerApiV2.GetActiveContractsPageResponse>;
    readonly now?: () => number;
}): Promise<ledgerApiV2.CreatedEvent | undefined> {
    const now = init.now ?? Date.now;

    if (!Number.isFinite(init.timeoutMs) || init.timeoutMs <= 0) {
        throw activeContractsTimeoutError();
    }

    const deadline = now() + init.timeoutMs;

    let request = init.request;

    let snapshotOffset: string | undefined;

    const seenPageTokens = new Set<string>();

    for (;;) {
        const remainingTimeoutMs = deadline - now();

        if (remainingTimeoutMs <= 0) {
            throw activeContractsTimeoutError();
        }

        const response = await init.readPageAsync(request, remainingTimeoutMs);

        if (snapshotOffset === undefined) {
            snapshotOffset = response.activeAtOffset;
        } else if (response.activeAtOffset !== snapshotOffset) {
            throw new Error(
                "An active-contract page returned a different snapshot offset.",
            );
        }

        const nextPageToken = response.nextPageToken;

        if (
            nextPageToken !== undefined
            && nextPageToken.length > 0
            && !snapshotOffset?.trim()
        ) {
            throw new Error(
                "A paginated active-contract response must include a non-empty stable snapshot offset.",
            );
        }

        const message = findActiveMessage(
            response.activeContracts,
            init.contractId,
        );

        if (message !== undefined) {
            return message;
        } else if (nextPageToken === undefined || nextPageToken.length === 0) {
            return undefined;
        }

        const pageTokenKey = Array.from(nextPageToken).join(",");

        if (seenPageTokens.has(pageTokenKey)) {
            throw new Error(
                "Active-contract pagination repeated a page token before finding the requested contract.",
            );
        }

        seenPageTokens.add(pageTokenKey);
        request = ledgerApiV2.GetActiveContractsPageRequest.create({
            activeAtOffset: snapshotOffset,
            eventFormat: init.request.eventFormat,
            maxPageSize: init.request.maxPageSize,
            pageToken: nextPageToken,
        });
    }
}

export async function collectActiveMessagesAcrossPagesAsync(init: {
    readonly request: ledgerApiV2.GetActiveContractsPageRequest;
    readonly predicate?: (message: ledgerApiV2.CreatedEvent) => boolean;
    readonly textMarker?: string;
    readonly timeoutMs: number;
    readonly readPageAsync: (
        request: ledgerApiV2.GetActiveContractsPageRequest,
        remainingTimeoutMs: number,
    ) => Promise<ledgerApiV2.GetActiveContractsPageResponse>;
    readonly now?: () => number;
}): Promise<readonly ledgerApiV2.CreatedEvent[]> {
    const predicate = activeMessagePredicate(init);

    const now = init.now ?? Date.now;

    if (!Number.isFinite(init.timeoutMs) || init.timeoutMs <= 0) {
        throw activeContractsTimeoutError();
    }

    const deadline = now() + init.timeoutMs;

    const messages: ledgerApiV2.CreatedEvent[] = [];

    const seenPageTokens = new Set<string>();

    let request = init.request;

    let snapshotOffset: string | undefined;

    for (;;) {
        const remainingTimeoutMs = deadline - now();

        if (remainingTimeoutMs <= 0) {
            throw activeContractsTimeoutError();
        }

        const response = await init.readPageAsync(request, remainingTimeoutMs);

        if (snapshotOffset === undefined) {
            snapshotOffset = response.activeAtOffset;
        } else if (response.activeAtOffset !== snapshotOffset) {
            throw new Error(
                "An active-contract page returned a different snapshot offset.",
            );
        }

        for (const message of activeMessages(response.activeContracts)) {
            if (predicate(message)) {
                messages.push(message);
            }
        }

        const nextPageToken = response.nextPageToken;

        if (nextPageToken === undefined || nextPageToken.length === 0) {
            return messages;
        } else if (!snapshotOffset?.trim()) {
            throw new Error(
                "A paginated active-contract response must include a non-empty stable snapshot offset.",
            );
        }

        const pageTokenKey = Array.from(nextPageToken).join(",");

        if (seenPageTokens.has(pageTokenKey)) {
            throw new Error(
                "Active-contract pagination repeated a page token while collecting Messages.",
            );
        }

        seenPageTokens.add(pageTokenKey);
        request = ledgerApiV2.GetActiveContractsPageRequest.create({
            activeAtOffset: snapshotOffset,
            eventFormat: init.request.eventFormat,
            maxPageSize: init.request.maxPageSize,
            pageToken: nextPageToken,
        });
    }
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
                    {
                        identifierFilter: {
                            oneofKind: "templateFilter",
                            templateFilter: {
                                templateId: {
                                    packageId: `#${init.templateId.packageName}`,
                                    moduleName: init.templateId.moduleName,
                                    entityName: init.templateId.entityName,
                                },
                                includeCreatedEventBlob: false,
                            },
                        },
                    },
                ],
            }),
        },
        verbose: true,
    });
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function activeContractsTimeoutError(): Error {
    return new Error(
        "Active-contract query timed out. Increase SDK_EXAMPLE_TIMEOUT_MS to allow more time for all pages.",
    );
}

function activeMessagePredicate(init: {
    readonly predicate?: (message: ledgerApiV2.CreatedEvent) => boolean;
    readonly textMarker?: string;
}): (message: ledgerApiV2.CreatedEvent) => boolean {
    if (init.predicate !== undefined && init.textMarker !== undefined) {
        throw new Error("Specify either an active Message predicate or text marker, not both.");
    } else if (init.predicate !== undefined) {
        return init.predicate;
    } else if (init.textMarker === undefined) {
        throw new Error("An active Message predicate or text marker is required.");
    }

    requireNonEmpty("Message text marker", init.textMarker);

    return message => readCreatedMessageText(message) === init.textMarker;
}

function activeMessages(
    activeContracts: readonly unknown[],
): readonly ledgerApiV2.CreatedEvent[] {
    const messages: ledgerApiV2.CreatedEvent[] = [];

    for (const response of activeContracts) {
        if (!isRecord(response) || !isRecord(response.contractEntry)) {
            continue;
        }

        const contractEntry = response.contractEntry;

        if (
            contractEntry.oneofKind !== "activeContract"
            || !isRecord(contractEntry.activeContract)
            || !ledgerApiV2.CreatedEvent.is(contractEntry.activeContract.createdEvent)
        ) {
            continue;
        }

        messages.push(contractEntry.activeContract.createdEvent);
    }

    return messages;
}
