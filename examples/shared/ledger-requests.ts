import { ledgerApiV2 } from "@distrohelena/canton-typescript-sdk/protobuf";
import type { ExampleTemplateId } from "./application-fixture.js";

export function buildActiveContractsRequest(init: {
    readonly party: string;
    readonly templateId: ExampleTemplateId;
}): ledgerApiV2.GetActiveContractsPageRequest {
    requireNonEmpty("party", init.party);
    requireNonEmpty("template package ID", init.templateId.packageId);
    requireNonEmpty("template module name", init.templateId.moduleName);
    requireNonEmpty("template entity name", init.templateId.entityName);

    return ledgerApiV2.GetActiveContractsPageRequest.create({
        eventFormat: ledgerApiV2.EventFormat.create({
            filtersByParty: {
                [init.party]: ledgerApiV2.Filters.create({
                    cumulative: [
                        {
                            identifierFilter: {
                                oneofKind: "templateFilter",
                                templateFilter: {
                                    templateId: init.templateId,
                                    includeCreatedEventBlob: false,
                                },
                            },
                        },
                    ],
                }),
            },
            verbose: true,
        }),
    });
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

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function activeContractsTimeoutError(): Error {
    return new Error(
        "Active-contract query timed out. Increase SDK_EXAMPLE_TIMEOUT_MS to allow more time for all pages.",
    );
}
