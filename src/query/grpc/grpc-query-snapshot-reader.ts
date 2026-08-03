import { ValidationError } from "../../core/errors/validation-error.js";
import { StateServiceClient } from "../../services/state/state-service-client.js";
import { UpdateServiceClient } from "../../services/update/update-service-client.js";
import {
    GetActiveContractsResponse,
    type GetActiveContractsPageRequest,
    type GetActiveContractsResponse as GetActiveContractsResponseType,
} from "../../transports/grpc/generated/canton/com/daml/ledger/api/v2/state_service.js";
import {
    GetUpdateResponse,
    type GetUpdateResponse as GetUpdateResponseType,
    type GetUpdatesPageRequest,
} from "../../transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js";
import { TransactionShape, type EventFormat, type UpdateFormat } from "../../transports/grpc/generated/canton/com/daml/ledger/api/v2/transaction_filter.js";
import { mapGrpcQueryContractsRequest } from "../../transports/grpc/mappers/contracts-mapper.js";
import { QuerySnapshotIncompleteError, type QuerySnapshotIncompleteReason } from "../errors/query-snapshot-incomplete-error.js";

type StateSnapshotReader = Pick<
    StateServiceClient,
    | "getLedgerEndAsync"
    | "getLatestPrunedOffsetsAsync"
    | "getActiveContractsPageAsync"
>;

type UpdateSnapshotReader = Pick<UpdateServiceClient, "getUpdatesPageAsync">;

export interface GrpcHistorySnapshot {
    readonly endInclusive: string;
    readonly updates: readonly GetUpdateResponseType[];
}

export interface GrpcActiveContractSnapshot {
    readonly activeAtOffset: string;
    readonly activeContracts: readonly GetActiveContractsResponseType[];
}

export interface GrpcQuerySnapshotReaderOptions {
    readonly maxHistoryPages?: number;
    readonly maxHistoryUpdates?: number;
    readonly maxActiveContractPages?: number;
    readonly maxActiveContracts?: number;
}

type RequiredOptions = Required<GrpcQuerySnapshotReaderOptions>;

const DEFAULT_OPTIONS: RequiredOptions = {
    maxHistoryPages: 10_000,
    maxHistoryUpdates: 1_000_000,
    maxActiveContractPages: 10_000,
    maxActiveContracts: 1_000_000,
};

const LEDGER_BEGIN = "0";

export class GrpcQuerySnapshotReader {
    private readonly options: RequiredOptions;

    public constructor(
        private readonly stateService: StateSnapshotReader,
        private readonly updateService: UpdateSnapshotReader,
        options: GrpcQuerySnapshotReaderOptions = {},
    ) {
        this.options = validateOptions(options);
    }

    public async readCurrentHistoryAsync(): Promise<GrpcHistorySnapshot> {
        const ledgerEnd = await this.stateService.getLedgerEndAsync({});

        return this.readHistoryAsync(ledgerEnd.offset);
    }

    public async readHistoryAsync(endInclusive: string): Promise<GrpcHistorySnapshot> {
        const end = parseOffset(endInclusive);

        if (end === undefined) {
            throw this.historyError(endInclusive, "invalid-offset");
        }

        const pruned = await this.stateService.getLatestPrunedOffsetsAsync({});

        const prunedUpTo = parseOffset(pruned.participantPrunedUpToInclusive);

        if (prunedUpTo === undefined || prunedUpTo !== 0n) {
            throw this.historyError(endInclusive, "participant-pruned");
        }

        const updateFormat = createHistoryUpdateFormat();

        const updates: GetUpdateResponseType[] = [];

        const observedPageTokens = new Set<string>();

        let expectedLowestExclusive = 0n;

        let pageToken: Uint8Array | undefined;

        let pagesRead = 0;

        while (true) {
            if (pagesRead >= this.options.maxHistoryPages) {
                throw this.historyError(endInclusive, "max-pages-exceeded");
            }

            const request: GetUpdatesPageRequest = {
                beginOffsetExclusive: LEDGER_BEGIN,
                endOffsetInclusive: endInclusive,
                updateFormat,
                descendingOrder: false,
                pageToken: pageToken === undefined ? undefined : Uint8Array.from(pageToken),
            };

            const response = await this.updateService.getUpdatesPageAsync(request);

            pagesRead += 1;

            const lowest = parseOffset(response.lowestPageOffsetExclusive);

            const highest = parseOffset(response.highestPageOffsetInclusive);

            if (lowest === undefined || highest === undefined) {
                throw this.historyError(endInclusive, "missing-boundary");
            } else if (lowest !== expectedLowestExclusive || highest < lowest || highest > end) {
                throw this.historyError(endInclusive, "page-boundary-mismatch");
            }

            updates.push(...response.updates.map(cloneFrozenUpdate));

            if (updates.length > this.options.maxHistoryUpdates) {
                throw this.historyError(endInclusive, "max-updates-exceeded");
            }

            const nextPageToken = response.nextPageToken;

            if (nextPageToken === undefined || nextPageToken.length === 0) {
                if (highest !== end) {
                    throw this.historyError(endInclusive, "nonterminal-page-without-token");
                }

                return freezeSnapshot({
                    endInclusive,
                    updates: Object.freeze(updates),
                });
            } else if (highest >= end) {
                throw this.historyError(endInclusive, "nonterminal-page-reaches-end");
            }

            const tokenKey = tokenKeyFor(nextPageToken);

            if (observedPageTokens.has(tokenKey)) {
                throw this.historyError(endInclusive, "repeated-page-token");
            }

            observedPageTokens.add(tokenKey);
            expectedLowestExclusive = highest;
            pageToken = Uint8Array.from(nextPageToken);
        }
    }

    public async readActiveContractsAsync(
        activeAtOffset: string,
    ): Promise<GrpcActiveContractSnapshot> {
        if (parseOffset(activeAtOffset) === undefined) {
            throw this.activeError(activeAtOffset, "invalid-offset");
        }

        const eventFormat = createAllPartiesEventFormat();

        const activeContracts: GetActiveContractsResponseType[] = [];

        const observedPageTokens = new Set<string>();

        let pageToken: Uint8Array | undefined;

        let pagesRead = 0;

        while (true) {
            if (pagesRead >= this.options.maxActiveContractPages) {
                throw this.activeError(activeAtOffset, "max-pages-exceeded");
            }

            const request: GetActiveContractsPageRequest = {
                activeAtOffset,
                eventFormat,
                pageToken: pageToken === undefined ? undefined : Uint8Array.from(pageToken),
            };

            const response = await this.stateService.getActiveContractsPageAsync(request);

            pagesRead += 1;

            const responseActiveAtOffset = parseOffset(response.activeAtOffset);

            if (responseActiveAtOffset === undefined) {
                throw this.activeError(activeAtOffset, "missing-active-at-offset");
            } else if (parseOffset(activeAtOffset) !== responseActiveAtOffset) {
                throw this.activeError(activeAtOffset, "active-at-offset-mismatch");
            } else if (response.activeContracts.length === 0 && response.nextPageToken?.length) {
                throw this.activeError(activeAtOffset, "empty-active-contract-page");
            }

            activeContracts.push(...response.activeContracts.map(cloneFrozenActiveContract));

            if (activeContracts.length > this.options.maxActiveContracts) {
                throw this.activeError(activeAtOffset, "max-active-contracts-exceeded");
            }

            const nextPageToken = response.nextPageToken;

            if (nextPageToken === undefined || nextPageToken.length === 0) {
                return freezeSnapshot({
                    activeAtOffset,
                    activeContracts: Object.freeze(activeContracts),
                });
            }

            const tokenKey = tokenKeyFor(nextPageToken);

            if (observedPageTokens.has(tokenKey)) {
                throw this.activeError(activeAtOffset, "repeated-page-token");
            }

            observedPageTokens.add(tokenKey);
            pageToken = Uint8Array.from(nextPageToken);
        }
    }

    private historyError(
        endInclusive: string,
        reason: QuerySnapshotIncompleteReason,
    ): QuerySnapshotIncompleteError {
        return new QuerySnapshotIncompleteError({
            beginExclusive: LEDGER_BEGIN,
            endInclusive,
            reason,
        });
    }

    private activeError(
        activeAtOffset: string | undefined,
        reason: QuerySnapshotIncompleteReason,
    ): QuerySnapshotIncompleteError {
        return new QuerySnapshotIncompleteError({
            beginExclusive: LEDGER_BEGIN,
            endInclusive: activeAtOffset ?? "",
            activeAtOffset,
            reason,
        });
    }
}

function validateOptions(options: GrpcQuerySnapshotReaderOptions): RequiredOptions {
    const validated = { ...DEFAULT_OPTIONS, ...options };

    for (const [name, value] of Object.entries(validated)) {
        if (!Number.isFinite(value) || !Number.isInteger(value) || value <= 0) {
            throw new ValidationError(`${name} must be a finite positive integer.`);
        }
    }

    return Object.freeze(validated);
}

function createHistoryUpdateFormat(): UpdateFormat {
    return {
        includeTransactions: {
            eventFormat: createAllPartiesEventFormat(),
            transactionShape: TransactionShape.LEDGER_EFFECTS,
        },
    };
}

function createAllPartiesEventFormat(): EventFormat {
    return mapGrpcQueryContractsRequest({ allParties: true }).eventFormat!;
}

function parseOffset(value: unknown): bigint | undefined {
    if (typeof value !== "string" || !/^\d+$/.test(value)) {
        return undefined;
    }

    return BigInt(value);
}

function tokenKeyFor(token: Uint8Array): string {
    return Array.from(token).join(",");
}

function cloneFrozenUpdate(update: GetUpdateResponseType): GetUpdateResponseType {
    return freezeDeep(
        GetUpdateResponse.fromBinary(GetUpdateResponse.toBinary(update)),
    );
}

function cloneFrozenActiveContract(
    activeContract: GetActiveContractsResponseType,
): GetActiveContractsResponseType {
    return freezeDeep(
        GetActiveContractsResponse.fromBinary(
            GetActiveContractsResponse.toBinary(activeContract),
        ),
    );
}

function freezeSnapshot<T extends object>(snapshot: T): T {
    return freezeDeep(snapshot);
}

function freezeDeep<T>(value: T): T {
    if (value === null || typeof value !== "object" || value instanceof Uint8Array) {
        return value;
    }

    for (const child of Object.values(value)) {
        freezeDeep(child);
    }

    return Object.freeze(value);
}
