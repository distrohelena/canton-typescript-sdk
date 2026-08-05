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
import { mapGrpcQueryContractsRequest, type GrpcQueryTemplateRef } from "../../transports/grpc/mappers/contracts-mapper.js";
import { immutableQueryValue } from "../canonical/query-dataset.js";
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
    /** Per-request page size for history reads; omitted means the participant's default. */
    readonly historyPageSize?: number;
    /** Per-request page size for ACS reads; omitted means the participant's default. */
    readonly activeContractPageSize?: number;
    /**
     * Opt-in: retain the last replayed history window in memory and only fetch offsets past it on later
     * reads. Off by default because the retained window lives for this reader's lifetime — its RAM cost is
     * the full materialized history, bounded only by maxHistoryUpdates.
     */
    readonly incrementalHistory?: boolean;
}

type RequiredOptions =
    & Required<Omit<GrpcQuerySnapshotReaderOptions, "historyPageSize" | "activeContractPageSize">>
    & Pick<GrpcQuerySnapshotReaderOptions, "historyPageSize" | "activeContractPageSize">;

const DEFAULT_LIMITS: Required<Omit<GrpcQuerySnapshotReaderOptions, "incrementalHistory" | "historyPageSize" | "activeContractPageSize">> = {
    maxHistoryPages: 10_000,
    maxHistoryUpdates: 1_000_000,
    maxActiveContractPages: 10_000,
    maxActiveContracts: 1_000_000,
};

const LEDGER_BEGIN = "0";

interface HistoryCacheEntry {
    readonly end: bigint;
    readonly updates: readonly GetUpdateResponseType[];
}

export class GrpcQuerySnapshotReader {
    private readonly options: RequiredOptions;
    private historyCache: HistoryCacheEntry | undefined;

    public constructor(
        private readonly stateService: StateSnapshotReader,
        private readonly updateService: UpdateSnapshotReader,
        options: GrpcQuerySnapshotReaderOptions = {},
    ) {
        this.options = validateOptions(options);
    }

    /** Whether an incremental history window is already held, meaning the next read only fetches new offsets. */
    public get hasHistoryCache(): boolean {
        return this.historyCache !== undefined;
    }

    public async readCurrentHistoryAsync(): Promise<GrpcHistorySnapshot> {
        const ledgerEnd = await this.stateService.getLedgerEndAsync({});

        return this.readHistoryAsync(ledgerEnd.offset);
    }

    public async readHistoryAsync(endInclusive: string): Promise<GrpcHistorySnapshot> {
        const end = parseOffset(endInclusive);

        if (end === undefined) {
            throw this.historyError(LEDGER_BEGIN, endInclusive, "invalid-offset");
        }

        const cached = this.options.incrementalHistory ? this.historyCache : undefined;

        // History is append-only, so a cached window ending at or past the requested offset already contains
        // the complete answer: an exact hit is returned as-is, a shorter request is a prefix of the window.
        if (cached !== undefined && cached.end >= end) {
            const updates = cached.end === end
                ? cached.updates
                : cached.updates.filter((update) => {
                    const offset = parseOffset(extractUpdateOffset(update));

                    return offset !== undefined && offset <= end;
                });

            return freezeSnapshot({ endInclusive, updates: Object.freeze([...updates]) });
        }

        const beginExclusive = cached?.end ?? 0n;

        const snapshot = await this.readHistoryRangeAsync(beginExclusive, end, endInclusive, cached?.updates ?? []);

        if (this.options.incrementalHistory && (this.historyCache === undefined || this.historyCache.end < end)) {
            this.historyCache = { end, updates: snapshot.updates };
        }

        return snapshot;
    }

    private async readHistoryRangeAsync(
        beginExclusive: bigint,
        end: bigint,
        endInclusive: string,
        seed: readonly GetUpdateResponseType[],
    ): Promise<GrpcHistorySnapshot> {
        const begin = beginExclusive.toString();

        const pruned = await this.stateService.getLatestPrunedOffsetsAsync({});

        const prunedUpTo = parseOffset(pruned.participantPrunedUpToInclusive);

        // Offsets at or below beginExclusive are already held (or not requested), so pruning only breaks the
        // read when it reaches past the range start.
        if (prunedUpTo === undefined || prunedUpTo > beginExclusive) {
            throw this.historyError(begin, endInclusive, "participant-pruned");
        }

        const updateFormat = freezeDeep(createHistoryUpdateFormat());

        const updates: GetUpdateResponseType[] = [];

        const observedPageTokens = new Set<string>();

        let expectedLowestExclusive = beginExclusive;

        let pageToken: Uint8Array | undefined;

        let pagesRead = 0;

        let previousUpdateOffset: bigint | undefined;

        while (true) {
            if (pagesRead >= this.options.maxHistoryPages) {
                throw this.historyError(begin, endInclusive, "max-pages-exceeded");
            }

            const request: GetUpdatesPageRequest = {
                beginOffsetExclusive: begin,
                endOffsetInclusive: endInclusive,
                updateFormat,
                descendingOrder: false,
                maxPageSize: this.options.historyPageSize,
                pageToken: pageToken === undefined ? undefined : Uint8Array.from(pageToken),
            };

            const response = await this.updateService.getUpdatesPageAsync(request);

            pagesRead += 1;

            const lowest = parseOffset(response.lowestPageOffsetExclusive);

            const highest = parseOffset(response.highestPageOffsetInclusive);

            if (lowest === undefined || highest === undefined) {
                throw this.historyError(begin, endInclusive, "missing-boundary");
            } else if (lowest !== expectedLowestExclusive || highest < lowest || highest > end) {
                throw this.historyError(begin, endInclusive, "page-boundary-mismatch");
            }

            if (response.updates.length > this.options.maxHistoryUpdates - seed.length - updates.length) {
                throw this.historyError(begin, endInclusive, "max-updates-exceeded");
            }

            for (const update of response.updates) {
                const updateOffset = parseOffset(extractUpdateOffset(update));

                if (updateOffset === undefined || updateOffset <= lowest || updateOffset > highest || (previousUpdateOffset !== undefined && updateOffset <= previousUpdateOffset)) {
                    throw this.historyError(begin, endInclusive, "page-boundary-mismatch");
                }

                previousUpdateOffset = updateOffset;
            }

            updates.push(...response.updates.map(cloneFrozenUpdate));

            const nextPageToken = response.nextPageToken;

            if (nextPageToken === undefined || nextPageToken.length === 0) {
                if (highest !== end) {
                    throw this.historyError(begin, endInclusive, "nonterminal-page-without-token");
                }

                return freezeSnapshot({
                    endInclusive,
                    updates: Object.freeze([...seed, ...updates]),
                });
            } else if (highest >= end) {
                throw this.historyError(begin, endInclusive, "nonterminal-page-reaches-end");
            } else if (highest <= lowest) {
                throw this.historyError(begin, endInclusive, "page-boundary-mismatch");
            }

            const tokenKey = tokenKeyFor(nextPageToken);

            if (observedPageTokens.has(tokenKey)) {
                throw this.historyError(begin, endInclusive, "repeated-page-token");
            }

            observedPageTokens.add(tokenKey);
            expectedLowestExclusive = highest;
            pageToken = Uint8Array.from(nextPageToken);
        }
    }

    public async readActiveContractsAsync(
        activeAtOffset: string,
        parties?: readonly string[],
        templateRefs?: readonly GrpcQueryTemplateRef[],
    ): Promise<GrpcActiveContractSnapshot> {
        if (parseOffset(activeAtOffset) === undefined) {
            throw this.activeError(activeAtOffset, "invalid-offset");
        }

        const eventFormat = freezeDeep(mapGrpcQueryContractsRequest({
            ...(parties === undefined ? { allParties: true } : { parties }),
            ...(templateRefs === undefined || templateRefs.length === 0 ? {} : { templateRefs: [...templateRefs] }),
        }).eventFormat!);

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
                maxPageSize: this.options.activeContractPageSize,
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

            if (response.activeContracts.length > this.options.maxActiveContracts - activeContracts.length) {
                throw this.activeError(activeAtOffset, "max-active-contracts-exceeded");
            }

            activeContracts.push(...response.activeContracts.map(cloneFrozenActiveContract));

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
        beginExclusive: string,
        endInclusive: string,
        reason: QuerySnapshotIncompleteReason,
    ): QuerySnapshotIncompleteError {
        return new QuerySnapshotIncompleteError({
            beginExclusive,
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
    const { incrementalHistory = false, historyPageSize, activeContractPageSize, ...limits } = options;

    if (typeof incrementalHistory !== "boolean") {
        throw new ValidationError("incrementalHistory must be a boolean.");
    }

    const validated = { ...DEFAULT_LIMITS, ...limits };

    for (const [name, value] of Object.entries({ ...validated, ...(historyPageSize === undefined ? {} : { historyPageSize }), ...(activeContractPageSize === undefined ? {} : { activeContractPageSize }) })) {
        if (!Number.isFinite(value) || !Number.isInteger(value) || value <= 0) {
            throw new ValidationError(`${name} must be a finite positive integer.`);
        }
    }

    return Object.freeze({ ...validated, historyPageSize, activeContractPageSize, incrementalHistory });
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
    if (typeof value !== "string" || !/^(?:0|[1-9]\d{0,18})$/.test(value)) {
        return undefined;
    }

    const parsed = BigInt(value);

    return parsed <= 9_223_372_036_854_775_807n ? parsed : undefined;
}

export function isCanonicalGrpcOffset(value: unknown): value is string {
    return parseOffset(value) !== undefined;
}

function extractUpdateOffset(update: GetUpdateResponseType): unknown {
    const oneof = update.update as { oneofKind?: string; transaction?: { offset?: unknown }; reassignment?: { offset?: unknown }; offsetCheckpoint?: { offset?: unknown }; topologyTransaction?: { offset?: unknown } };

    switch (oneof.oneofKind) {
        case "transaction": return oneof.transaction?.offset;
        case "reassignment": return oneof.reassignment?.offset;
        case "offsetCheckpoint": return oneof.offsetCheckpoint?.offset;
        case "topologyTransaction": return oneof.topologyTransaction?.offset;
        default: return undefined;
    }
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
    if (value instanceof Uint8Array) {
        return immutableQueryValue(value) as T;
    } else if (value === null || typeof value !== "object") {
        return value;
    } else if (Object.isFrozen(value)) {
        return value;
    }

    for (const [property, child] of Object.entries(value)) {
        (value as Record<string, unknown>)[property] = freezeDeep(child);
    }

    return Object.freeze(value);
}
