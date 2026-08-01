import { ledgerApiV2 } from "@distrohelena/canton-typescript-sdk/protobuf";
import type { ExampleTemplateId } from "./application-fixture.js";

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

        if (
            snapshotOffset !== undefined
            && response.activeAtOffset !== snapshotOffset
        ) {
            throw new Error(
                "An active-contract page returned a different snapshot offset.",
            );
        }

        const message = findActiveMessage(
            response.activeContracts,
            init.contractId,
        );

        if (message !== undefined) {
            return message;
        }

        const nextPageToken = response.nextPageToken;

        if (nextPageToken === undefined || nextPageToken.length === 0) {
            return undefined;
        }

        const pageTokenKey = Array.from(nextPageToken).join(",");

        if (seenPageTokens.has(pageTokenKey)) {
            throw new Error(
                "Active-contract pagination repeated a page token before finding the requested contract.",
            );
        }

        seenPageTokens.add(pageTokenKey);
        snapshotOffset ??= response.activeAtOffset;
        request = ledgerApiV2.GetActiveContractsPageRequest.create({
            activeAtOffset: snapshotOffset,
            eventFormat: init.request.eventFormat,
            maxPageSize: init.request.maxPageSize,
            pageToken: nextPageToken,
        });
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
