import { isProxy } from "node:util/types";
import { ValidationError } from "../../core/errors/validation-error.js";
import { StateServiceClient } from "../../services/state/state-service-client.js";
import { UpdateServiceClient } from "../../services/update/update-service-client.js";
import type { GetActiveContractsResponse } from "../../transports/grpc/generated/canton/com/daml/ledger/api/v2/state_service.js";
import type { CreatedEvent } from "../../transports/grpc/generated/canton/com/daml/ledger/api/v2/event.js";
import type { GetUpdatesPageRequest } from "../../transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js";
import { TransactionShape } from "../../transports/grpc/generated/canton/com/daml/ledger/api/v2/transaction_filter.js";
import { mapGrpcQueryContractsRequest } from "../../transports/grpc/mappers/contracts-mapper.js";
import { QueryCacheStore } from "../cache/query-cache-store.js";
import { ContractRow } from "../model-types.js";
import { ContractCacheArgs, ContractCacheInspection, ContractCacheResult } from "../query-client.js";
import { QuerySource } from "../query-source.js";
import { mapGrpcQueryRelationFragment } from "./grpc-relation-mapper.js";
import { isCanonicalGrpcOffset } from "./grpc-query-snapshot-reader.js";

type ActiveContractsReader = Pick<StateServiceClient, "getActiveContractsPageAsync"> & Partial<Pick<StateServiceClient, "getLedgerEndAsync" | "getLatestPrunedOffsetsAsync">>;

type CacheUpdateReader = Pick<UpdateServiceClient, "getUpdatesPageAsync">;

/** Budgets for patching a warm snapshot forward from the update stream instead of re-downloading the ACS. */
export interface GrpcContractCacheDeltaOptions {
    /**
     * BETA: delta refresh is opt-in. When absent or false, every re-warm performs the full ACS download
     * regardless of the other options here.
     */
    readonly enabled?: boolean;
    /** Skip the delta attempt outright when the ledger has run further than this past the snapshot. */
    readonly maxOffsetGap?: number;
    /** Abandon the delta (fall back to a full download) after this many applied updates. */
    readonly maxUpdates?: number;
}

const DELTA_DEFAULT_MAX_OFFSET_GAP = 1_000_000;

const DELTA_MAX_PAGES = 10_000;

/** Per-contract creation facts the contractType join needs; stored so cached reads never re-fetch the ACS. */
export interface GrpcCachedCreationMetadata {
    readonly contractId: string;
    readonly packageName: string;
    readonly representativePackageId: string | null;
}

interface CachedContractSnapshot {
    readonly version: 2;
    readonly endpointScope: string;
    readonly parties: readonly string[] | undefined;
    readonly activeAtOffset: string;
    readonly expiresAtEpochMs: number;
    readonly contracts: readonly ContractRow[];
    readonly creationMetadata: readonly GrpcCachedCreationMetadata[];
}

/** Internal point-in-time active-contract cache lookup used by query planning. */
export interface GrpcCachedContractSnapshot {
    readonly activeAtOffset: string;
    readonly contracts: readonly ContractRow[];
    readonly creationMetadata: readonly GrpcCachedCreationMetadata[];
}

interface MaterializedActiveContractsPage {
    readonly activeAtOffset: string;
    readonly activeContracts: readonly GetActiveContractsResponse[];
    readonly nextPageToken: Uint8Array | undefined;
}

export class GrpcContractCache {
    private readonly inflight = new Map<string, Promise<ContractCacheResult>>();

    public constructor(
        private readonly stateService: ActiveContractsReader,
        private readonly store: QueryCacheStore,
        private readonly ttlMs: number,
        private readonly endpointScope: string,
        private readonly now: () => number = Date.now,
        private readonly maxPageSize?: number,
        private readonly updateService?: CacheUpdateReader,
        private readonly delta: GrpcContractCacheDeltaOptions = {},
    ) {
        if (!Number.isFinite(ttlMs) || ttlMs <= 0) {
            throw new ValidationError("Contract cache ttlMs must be a positive finite number.");
        } else if (maxPageSize !== undefined && (!Number.isFinite(maxPageSize) || !Number.isInteger(maxPageSize) || maxPageSize <= 0)) {
            throw new ValidationError("Contract cache maxPageSize must be a positive integer.");
        }

        for (const [name, value] of Object.entries({ maxOffsetGap: delta.maxOffsetGap, maxUpdates: delta.maxUpdates })) {
            if (value !== undefined && (!Number.isFinite(value) || !Number.isInteger(value) || value < 0)) {
                throw new ValidationError(`Contract cache delta ${name} must be a non-negative integer.`);
            }
        }
    }

    public async cacheContracts(args?: ContractCacheArgs): Promise<ContractCacheResult> {
        const parties = normalizeParties(args);

        const key = cacheKey(this.endpointScope, parties);

        const current = this.inflight.get(key);

        if (current !== undefined) {
            return current;
        }

        const promise = this.populateAsync(parties, key);

        this.inflight.set(key, promise);
        void promise.then(
            () => this.clearInflight(key, promise),
            () => this.clearInflight(key, promise),
        );

        return promise;
    }

    public async readContractsAsync(args?: ContractCacheArgs): Promise<readonly ContractRow[] | undefined> {
        const snapshot = await this.readSnapshotAsync(args);

        return snapshot?.contracts;
    }

    public async readSnapshotAsync(args?: ContractCacheArgs): Promise<GrpcCachedContractSnapshot | undefined> {
        const parties = normalizeParties(args);

        const cached = await this.store.getAsync<unknown>(cacheKey(this.endpointScope, parties));

        const nowEpochMs = currentEpochMs(this.now);

        const snapshot = asCompatibleSnapshot(cached, this.endpointScope, parties, nowEpochMs);

        if (snapshot === undefined) {
            return undefined;
        }

        return Object.freeze({ activeAtOffset: snapshot.activeAtOffset, contracts: snapshot.contracts, creationMetadata: snapshot.creationMetadata });
    }

    public async invalidateContractsCache(args?: ContractCacheArgs): Promise<void> {
        const parties = normalizeParties(args);

        const key = cacheKey(this.endpointScope, parties);

        try {
            await this.inflight.get(key);
        } catch {
            // A failed prewarm leaves no completed snapshot to preserve.
        }

        await this.store.deleteAsync(key);
    }

    /** Measures the cached snapshot against the current ledger end, without changing anything. */
    public async inspectContractsCacheAsync(args?: ContractCacheArgs): Promise<ContractCacheInspection | undefined> {
        const parties = normalizeParties(args);

        const base = asCompatibleSnapshot(
            await this.store.getAsync<unknown>(cacheKey(this.endpointScope, parties)),
            this.endpointScope,
            parties,
            currentEpochMs(this.now),
            true,
        );

        if (base === undefined || this.stateService.getLedgerEndAsync === undefined) {
            return undefined;
        }

        const ledgerEnd = parseCacheOffset((await this.stateService.getLedgerEndAsync({})).offset);

        const activeAt = parseCacheOffset(base.activeAtOffset);

        if (ledgerEnd === undefined || activeAt === undefined || ledgerEnd < activeAt) {
            return undefined;
        }

        return Object.freeze({
            activeAtOffset: base.activeAtOffset,
            ledgerEndOffset: ledgerEnd.toString(),
            offsetGap: (ledgerEnd - activeAt).toString(),
            contractCount: base.contracts.length,
            expiresAt: new Date(base.expiresAtEpochMs),
        });
    }

    private async populateAsync(
        parties: readonly string[] | undefined,
        key: string,
    ): Promise<ContractCacheResult> {
        // An expired snapshot is still a valid delta base: expiry gates queries, not refreshes.
        const base = asCompatibleSnapshot(await this.store.getAsync<unknown>(key), this.endpointScope, parties, currentEpochMs(this.now), true);

        if (base !== undefined && this.updateService !== undefined && this.delta.enabled === true) {
            const delta = await this.tryDeltaRefreshAsync(parties, key, base);

            if (delta !== undefined) {
                return delta;
            }
        }

        return this.fullRefreshAsync(parties, key, base);
    }

    /**
     * Patches the base snapshot forward from the update stream instead of re-downloading the ACS. Returns
     * undefined — meaning "do the full download instead" — whenever correctness cannot be proven cheaply:
     * pruning past the base offset, an offset gap or update count beyond the configured budgets, any
     * reassignment or topology change in the window (multi-synchronizer moves cannot be patched safely), an
     * exercised event where ACS_DELTA promises none, or an archive/create inconsistent with the base rows.
     */
    private async tryDeltaRefreshAsync(
        parties: readonly string[] | undefined,
        key: string,
        base: CachedContractSnapshot,
    ): Promise<ContractCacheResult | undefined> {
        if (this.stateService.getLedgerEndAsync === undefined || this.stateService.getLatestPrunedOffsetsAsync === undefined || this.updateService === undefined) {
            return undefined;
        }

        try {
            const baseOffset = parseCacheOffset(base.activeAtOffset);

            const pruned = parseCacheOffset((await this.stateService.getLatestPrunedOffsetsAsync({})).participantPrunedUpToInclusive);

            const ledgerEnd = parseCacheOffset((await this.stateService.getLedgerEndAsync({})).offset);

            if (baseOffset === undefined || pruned === undefined || pruned > baseOffset || ledgerEnd === undefined || ledgerEnd < baseOffset) {
                return undefined;
            }

            const offsetGap = ledgerEnd - baseOffset;

            if (offsetGap === 0n) {
                return this.writeSnapshotAsync(parties, key, base.activeAtOffset, base.contracts, base.creationMetadata, { refresh: "noop", offsetGap: "0" });
            }

            const maxOffsetGap = BigInt(this.delta.maxOffsetGap ?? DELTA_DEFAULT_MAX_OFFSET_GAP);

            if (offsetGap > maxOffsetGap) {
                return undefined;
            }

            const window = await this.readDeltaWindowAsync(parties, base, ledgerEnd.toString());

            if (window === undefined) {
                return undefined;
            }

            const baseIds = new Set(base.contracts.map((row) => row.contractId));

            const adds = new Map<string, { readonly event: CreatedEvent; readonly synchronizerId: string }>();

            const removes = new Set<string>();

            for (const entry of window.entries) {
                if (entry.kind === "created") {
                    if (baseIds.has(entry.event.contractId) || adds.has(entry.event.contractId)) {
                        return undefined;
                    }

                    adds.set(entry.event.contractId, { event: entry.event, synchronizerId: entry.synchronizerId });
                } else if (adds.has(entry.contractId)) {
                    adds.delete(entry.contractId);
                } else if (baseIds.has(entry.contractId)) {
                    removes.add(entry.contractId);
                } else {
                    return undefined;
                }
            }

            const survivors = [...adds.values()].map(({ event, synchronizerId }) => ({
                contractEntry: {
                    oneofKind: "activeContract" as const,
                    activeContract: { createdEvent: event, synchronizerId, reassignmentCounter: "0" },
                },
            }) as GetActiveContractsResponse);

            const fragment = mapGrpcQueryRelationFragment([], survivors);

            const contracts = [...base.contracts.filter((row) => !removes.has(row.contractId)), ...fragment.contracts]
                .sort((left, right) => left.contractId.localeCompare(right.contractId));

            const addedMetadata = fragment.creationIdentities.map((identity) => ({
                contractId: identity.contractId,
                packageName: identity.packageName,
                representativePackageId: identity.representativePackageId,
            }));

            const creationMetadata = [...base.creationMetadata.filter((entry) => !removes.has(entry.contractId)), ...addedMetadata]
                .sort((left, right) => left.contractId.localeCompare(right.contractId));

            return await this.writeSnapshotAsync(parties, key, ledgerEnd.toString(), contracts, creationMetadata, {
                refresh: "delta",
                offsetGap: offsetGap.toString(),
                deltaUpdateCount: window.entries.length,
            });
        } catch {
            // Any validation failure in the window falls back to the full download, which re-validates from scratch.
            return undefined;
        }
    }

    private async readDeltaWindowAsync(
        parties: readonly string[] | undefined,
        base: CachedContractSnapshot,
        endInclusive: string,
    ): Promise<{ readonly entries: readonly DeltaEntry[] } | undefined> {
        const eventFormat = mapGrpcQueryContractsRequest(parties === undefined ? { allParties: true } : { parties }).eventFormat!;

        const maxUpdates = this.delta.maxUpdates ?? Math.max(1_000, 2 * base.contracts.length);

        const entries: DeltaEntry[] = [];

        const seenPageTokens = new Set<string>();

        const end = parseCacheOffset(endInclusive)!;

        let expectedLowestExclusive = parseCacheOffset(base.activeAtOffset)!;

        let pageToken: Uint8Array | undefined;

        let updatesSeen = 0;

        for (let pagesRead = 0; pagesRead < DELTA_MAX_PAGES; pagesRead += 1) {
            const request: GetUpdatesPageRequest = {
                beginOffsetExclusive: base.activeAtOffset,
                endOffsetInclusive: endInclusive,
                updateFormat: { includeTransactions: { eventFormat, transactionShape: TransactionShape.ACS_DELTA } },
                descendingOrder: false,
                pageToken: pageToken === undefined ? undefined : Uint8Array.from(pageToken),
            };

            const response = await this.updateService!.getUpdatesPageAsync(request);

            const lowest = parseCacheOffset(response.lowestPageOffsetExclusive);

            const highest = parseCacheOffset(response.highestPageOffsetInclusive);

            if (lowest === undefined || highest === undefined || lowest !== expectedLowestExclusive || highest < lowest || highest > end) {
                return undefined;
            }

            updatesSeen += response.updates.length;

            if (updatesSeen > maxUpdates) {
                return undefined;
            }

            for (const update of response.updates) {
                const collected = collectDeltaEntries(update, entries);

                if (!collected) {
                    return undefined;
                }
            }

            const nextPageToken = response.nextPageToken;

            if (nextPageToken === undefined || nextPageToken.length === 0) {
                return highest === end ? { entries } : undefined;
            } else if (highest >= end || highest <= lowest) {
                return undefined;
            }

            const tokenKey = Array.from(nextPageToken).join(",");

            if (seenPageTokens.has(tokenKey)) {
                return undefined;
            }

            seenPageTokens.add(tokenKey);
            expectedLowestExclusive = highest;
            pageToken = Uint8Array.from(nextPageToken);
        }

        return undefined;
    }

    private async writeSnapshotAsync(
        parties: readonly string[] | undefined,
        key: string,
        activeAtOffset: string,
        contracts: readonly ContractRow[],
        creationMetadata: readonly GrpcCachedCreationMetadata[],
        outcome: { readonly refresh: "delta" | "noop"; readonly offsetGap: string; readonly deltaUpdateCount?: number },
    ): Promise<ContractCacheResult> {
        const expiresAtEpochMs = effectiveExpiryEpochMs(this.now, this.ttlMs);

        const snapshot: CachedContractSnapshot = {
            version: 2,
            endpointScope: this.endpointScope,
            parties,
            activeAtOffset,
            expiresAtEpochMs,
            contracts: copyRows(contracts),
            creationMetadata: creationMetadata.map((entry) => ({ ...entry })),
        };

        await this.store.setAsync(key, snapshot, this.ttlMs);

        return {
            source: QuerySource.grpc,
            cached: true,
            activeAtOffset,
            contractCount: contracts.length,
            expiresAt: new Date(expiresAtEpochMs),
            ...outcome,
        };
    }

    private async fullRefreshAsync(
        parties: readonly string[] | undefined,
        key: string,
        base: CachedContractSnapshot | undefined,
    ): Promise<ContractCacheResult> {
        const activeContracts: GetActiveContractsResponse[] = [];

        const seenPageTokens = new Set<string>();

        // Every continuation request must be identical to the first page's request apart from the page
        // token: the participant validates each token against the request it was minted for, so adopting
        // the response's now-explicit activeAtOffset into page 2+ makes it reject the token
        // (INVALID_ACS_PAGE_TOKEN) — the token was prepared for a request with the field absent. The token
        // itself pins the snapshot offset; the echoed offset is only tracked to validate it stays constant.
        const baseRequest = mapGrpcQueryContractsRequest(parties === undefined
            ? { allParties: true, maxPageSize: this.maxPageSize }
            : { parties, maxPageSize: this.maxPageSize });

        let activeAtOffset: string | undefined;

        let pageToken: Uint8Array | undefined;

        do {
            const page = materializeActiveContractsPage(
                await this.stateService.getActiveContractsPageAsync({
                    ...baseRequest,
                    pageToken: pageToken === undefined ? undefined : Uint8Array.from(pageToken),
                }),
            );

            if (activeAtOffset === undefined) {
                activeAtOffset = page.activeAtOffset;
            } else if (activeAtOffset !== page.activeAtOffset) {
                throw new Error("Active-contracts response activeAtOffset changed during traversal.");
            }

            activeContracts.push(...page.activeContracts);
            pageToken = page.nextPageToken;

            if (pageToken !== undefined && pageToken.length > 0) {
                const tokenKey = Array.from(pageToken).join(",");

                if (seenPageTokens.has(tokenKey)) {
                    throw new Error("Active-contracts response repeated a page token.");
                }

                seenPageTokens.add(tokenKey);
            }
        } while (pageToken !== undefined && pageToken.length > 0);

        const fragment = mapGrpcQueryRelationFragment([], activeContracts);

        const contracts = fragment.contracts;

        const creationMetadata = fragment.creationIdentities.map((identity) => ({
            contractId: identity.contractId,
            packageName: identity.packageName,
            representativePackageId: identity.representativePackageId,
        }));

        const expiresAtEpochMs = effectiveExpiryEpochMs(this.now, this.ttlMs);

        const baseOffset = base === undefined ? undefined : parseCacheOffset(base.activeAtOffset);

        const newOffset = parseCacheOffset(activeAtOffset!);

        const result: ContractCacheResult = {
            source: QuerySource.grpc,
            cached: true,
            activeAtOffset: activeAtOffset!,
            contractCount: contracts.length,
            expiresAt: new Date(expiresAtEpochMs),
            refresh: "full",
            ...(baseOffset !== undefined && newOffset !== undefined && newOffset >= baseOffset
                ? { offsetGap: (newOffset - baseOffset).toString() }
                : {}),
        };

        const snapshot: CachedContractSnapshot = {
            version: 2,
            endpointScope: this.endpointScope,
            parties,
            activeAtOffset: activeAtOffset!,
            expiresAtEpochMs,
            contracts: copyRows(contracts),
            creationMetadata,
        };

        await this.store.setAsync(key, snapshot, this.ttlMs);

        return result;
    }

    private clearInflight(key: string, promise: Promise<ContractCacheResult>): void {
        if (this.inflight.get(key) === promise) {
            this.inflight.delete(key);
        }
    }
}

export function normalizeParties(args?: ContractCacheArgs): readonly string[] | undefined {
    try {
        if (args === undefined) {
            return undefined;
        }

        const candidate = args.parties;

        if (candidate === undefined) {
            return undefined;
        } else if (!Array.isArray(candidate)) {
            throw new ValidationError("Contract cache parties must contain non-empty strings.");
        }

        const values = materializeIndexedArray(candidate);

        if (values === undefined || values.length === 0) {
            throw new ValidationError("Contract cache parties must contain non-empty strings.");
        }

        const parties = values.map((party) => {
            if (typeof party !== "string" || party.trim().length === 0) {
                throw new ValidationError("Contract cache parties must contain non-empty strings.");
            }

            return party;
        });

        return Object.freeze([...new Set(parties)].sort());
    } catch (error) {
        if (isValidationError(error)) {
            throw error;
        }

        throw new ValidationError("Contract cache parties must be a non-empty array of strings when provided.");
    }
}

function cacheKey(endpointScope: string, parties: readonly string[] | undefined): string {
    return `grpc-contract-cache:v1:${JSON.stringify([endpointScope, parties])}`;
}

type DeltaEntry =
    | { readonly kind: "created"; readonly event: CreatedEvent; readonly synchronizerId: string }
    | { readonly kind: "archived"; readonly contractId: string };

/** Collects created/archived events from one ACS_DELTA update; false means the window cannot be patched. */
function collectDeltaEntries(update: unknown, entries: DeltaEntry[]): boolean {
    if (update === null || typeof update !== "object") {
        return false;
    }

    const oneof = (update as { update?: { oneofKind?: string; transaction?: { synchronizerId?: unknown; events?: unknown } } }).update;

    if (oneof === undefined || oneof.oneofKind === "offsetCheckpoint") {
        return oneof !== undefined;
    } else if (oneof.oneofKind !== "transaction") {
        // Reassignments and topology changes move contracts between synchronizers/visibility in ways a
        // row-level patch cannot represent safely.
        return false;
    }

    const transaction = oneof.transaction;

    const synchronizerId = transaction?.synchronizerId;

    if (typeof synchronizerId !== "string" || synchronizerId.length === 0 || !Array.isArray(transaction?.events)) {
        return false;
    }

    for (const wrapped of transaction.events as readonly { event?: { oneofKind?: string; created?: CreatedEvent; archived?: { contractId?: unknown } } }[]) {
        const event = wrapped?.event;

        if (event?.oneofKind === "created" && event.created !== undefined) {
            entries.push({ kind: "created", event: event.created, synchronizerId });
        } else if (event?.oneofKind === "archived" && typeof event.archived?.contractId === "string" && event.archived.contractId.length > 0) {
            entries.push({ kind: "archived", contractId: event.archived.contractId });
        } else {
            return false;
        }
    }

    return true;
}

function parseCacheOffset(value: unknown): bigint | undefined {
    return isCanonicalGrpcOffset(value) ? BigInt(value) : undefined;
}

function asCompatibleSnapshot(
    value: unknown,
    endpointScope: string,
    parties: readonly string[] | undefined,
    nowEpochMs: number,
    ignoreExpiry = false,
): CachedContractSnapshot | undefined {
    try {
        if (value === null || typeof value !== "object") {
            return undefined;
        }

        const candidate = value as Partial<CachedContractSnapshot>;

        const version = candidate.version;

        const storedEndpointScope = candidate.endpointScope;

        const rawParties = candidate.parties;

        const storedParties = rawParties === undefined ? undefined : materializeStringArray(rawParties);

        const activeAtOffset = candidate.activeAtOffset;

        const expiresAtEpochMs = candidate.expiresAtEpochMs;

        const contracts = materializeContractRows(candidate.contracts);

        const creationMetadata = materializeCreationMetadata(candidate.creationMetadata, contracts);

        if (
            version !== 2
            || storedEndpointScope !== endpointScope
            || (rawParties !== undefined && storedParties === undefined)
            || !sameParties(storedParties, parties)
            || typeof nowEpochMs !== "number"
            || !Number.isFinite(nowEpochMs)
            || !Number.isFinite(new Date(nowEpochMs).getTime())
            || !isCanonicalGrpcOffset(activeAtOffset)
            || typeof expiresAtEpochMs !== "number"
            || !Number.isFinite(expiresAtEpochMs)
            || !Number.isFinite(new Date(expiresAtEpochMs).getTime())
            || (!ignoreExpiry && expiresAtEpochMs <= nowEpochMs)
            || contracts === undefined
            || creationMetadata === undefined
        ) {
            return undefined;
        }

        return {
            version,
            endpointScope: storedEndpointScope,
            parties: storedParties,
            activeAtOffset,
            expiresAtEpochMs,
            contracts,
            creationMetadata,
        };
    } catch {
        return undefined;
    }
}

function sameParties(left: readonly string[] | undefined, right: readonly string[] | undefined): boolean {
    return left === undefined
        ? right === undefined
        : Array.isArray(left)
            && right !== undefined
            && left.length === right.length
            && left.every((party, index) => typeof party === "string" && party === right[index]);
}

function materializeActiveContractsPage(value: unknown): MaterializedActiveContractsPage {
    try {
        if (value === null || typeof value !== "object") {
            throw new Error("Active-contracts response is invalid.");
        }

        const candidate = value as { activeAtOffset?: unknown; activeContracts?: unknown; nextPageToken?: unknown };

        const activeAtOffset = candidate.activeAtOffset;

        if (!isCanonicalGrpcOffset(activeAtOffset)) {
            throw new Error("Active-contracts response is missing activeAtOffset.");
        }

        const activeContracts = materializeIndexedValues(
            candidate.activeContracts,
            materializeActiveContractResponse,
        );

        if (activeContracts === undefined) {
            throw new Error("Active-contracts response activeContracts is invalid.");
        }

        const nextPageToken = materializePageToken(candidate.nextPageToken);

        return {
            activeAtOffset,
            activeContracts,
            nextPageToken,
        };
    } catch (error) {
        if (isError(error)) {
            throw error;
        }

        throw new Error("Active-contracts response is invalid.");
    }
}

function materializeActiveContractResponse(value: unknown): GetActiveContractsResponse {
    const copy = copyValue(value);

    if (copy === null || typeof copy !== "object") {
        throw new Error("Active-contracts response contains an invalid contract entry.");
    }

    return copy as GetActiveContractsResponse;
}

function materializePageToken(value: unknown): Uint8Array | undefined {
    if (value === undefined) {
        return undefined;
    } else if (isProxy(value) || !isUint8Array(value)) {
        throw new Error("Active-contracts response nextPageToken is invalid.");
    }

    try {
        return new Uint8Array(value);
    } catch {
        throw new Error("Active-contracts response nextPageToken is invalid.");
    }
}

function materializeCreationMetadata(
    value: unknown,
    contracts: readonly ContractRow[] | undefined,
): readonly GrpcCachedCreationMetadata[] | undefined {
    if (contracts === undefined) {
        return undefined;
    }

    const entries = materializeIndexedValues(value, materializeCreationMetadataEntry);

    if (entries === undefined || entries.some((entry) => entry === undefined)) {
        return undefined;
    }

    const materialized = entries as readonly GrpcCachedCreationMetadata[];

    // Coherence: exactly one metadata entry per contract row, so the contractType join can never dangle.
    const metadataContractIds = new Set(materialized.map((entry) => entry.contractId));

    if (
        metadataContractIds.size !== materialized.length
        || materialized.length !== contracts.length
        || !contracts.every((row) => metadataContractIds.has(row.contractId))
    ) {
        return undefined;
    }

    return materialized;
}

function materializeCreationMetadataEntry(value: unknown): GrpcCachedCreationMetadata | undefined {
    if (value === null || typeof value !== "object") {
        return undefined;
    }

    const candidate = value as Partial<GrpcCachedCreationMetadata>;

    const contractId = candidate.contractId;

    const packageName = candidate.packageName;

    const representativePackageId = candidate.representativePackageId;

    if (
        typeof contractId !== "string"
        || typeof packageName !== "string"
        || packageName.length === 0
        || (typeof representativePackageId !== "string" && representativePackageId !== null)
    ) {
        return undefined;
    }

    return { contractId, packageName, representativePackageId };
}

function materializeContractRows(value: unknown): readonly ContractRow[] | undefined {
    const rows = materializeIndexedValues(value, materializeContractRow);

    if (rows === undefined) {
        return undefined;
    }

    return rows.every((row) => row !== undefined) ? rows as readonly ContractRow[] : undefined;
}

function materializeContractRow(value: unknown): ContractRow | undefined {
    if (value === null || typeof value !== "object") {
        return undefined;
    }

    const candidate = value as Partial<ContractRow>;

    const contractId = candidate.contractId;

    const templateId = materializeTemplateId(candidate.templateId);

    const packageId = candidate.packageId;

    const payload = copyValue(candidate.payload);

    const witnesses = materializeStringArray(candidate.witnesses);

    const createdEventOffset = candidate.createdEventOffset;

    const createdAt = materializeOptionalDate(candidate.createdAt);

    const archivedEventOffset = candidate.archivedEventOffset;

    const archivedAt = candidate.archivedAt;

    const active = candidate.active;

    if (
        typeof contractId !== "string"
        || templateId === undefined
        || (typeof packageId !== "string" && packageId !== null)
        || witnesses === undefined
        || typeof createdEventOffset !== "string"
        || createdAt === undefined
        || archivedEventOffset !== null
        || archivedAt !== null
        || active !== true
    ) {
        return undefined;
    }

    return {
        contractId,
        templateId,
        packageId,
        payload,
        witnesses,
        createdEventOffset,
        createdAt,
        archivedEventOffset,
        archivedAt,
        active,
    };
}

function materializeTemplateId(value: unknown): ContractRow["templateId"] | undefined {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
        return undefined;
    }

    const candidate = value as { packageId?: unknown; moduleName?: unknown; entityName?: unknown };

    const packageId = candidate.packageId;

    const moduleName = candidate.moduleName;

    const entityName = candidate.entityName;

    return typeof packageId === "string" && typeof moduleName === "string" && typeof entityName === "string"
        ? { packageId, moduleName, entityName }
        : undefined;
}

function materializeStringArray(value: unknown): readonly string[] | undefined {
    const values = materializeIndexedArray(value);

    if (values === undefined) {
        return undefined;
    }

    return values.every((entry) => typeof entry === "string") ? values as readonly string[] : undefined;
}

function materializeIndexedArray(value: unknown): readonly unknown[] | undefined {
    return materializeIndexedValues(value, (entry) => entry);
}

function materializeIndexedValues<T>(
    value: unknown,
    materialize: (entry: unknown) => T,
): readonly T[] | undefined {
    if (isProxy(value) || !Array.isArray(value)) {
        return undefined;
    }

    const length = value.length;

    if (!Number.isSafeInteger(length) || length < 0) {
        return undefined;
    }

    const values: T[] = [];

    for (let index = 0; index < length; index += 1) {
        values.push(materialize(value[index]));
    }

    return values;
}

function materializeOptionalDate(value: unknown): Date | null | undefined {
    if (value === null) {
        return null;
    } else if (!isDate(value)) {
        return undefined;
    }

    const epochMs = value.getTime();

    return Number.isFinite(epochMs) ? new Date(epochMs) : undefined;
}

function copyRows(rows: readonly ContractRow[]): readonly ContractRow[] {
    return rows.map((row) => ({
        ...row,
        templateId: { ...row.templateId },
        payload: copyValue(row.payload),
        witnesses: [...row.witnesses],
        createdAt: row.createdAt === null ? null : new Date(row.createdAt.getTime()),
        archivedAt: row.archivedAt === null ? null : new Date(row.archivedAt.getTime()),
    }));
}

function copyValue(value: unknown): unknown {
    if (value === undefined || value === null || typeof value !== "object") {
        return value;
    }

    const copy = structuredClone(value);

    if (containsSharedMemory(copy, new Set())) {
        throw new Error("Contract payload must not contain shared memory.");
    }

    return copy;
}

function containsSharedMemory(value: unknown, seen: Set<object>): boolean {
    if (value === null || typeof value !== "object") {
        return false;
    } else if (isSharedArrayBuffer(value)) {
        return true;
    } else if (seen.has(value)) {
        return false;
    }

    seen.add(value);

    if (ArrayBuffer.isView(value)) {
        return isSharedArrayBuffer(value.buffer);
    } else if (isMap(value)) {
        for (const [key, entry] of value) {
            if (containsSharedMemory(key, seen) || containsSharedMemory(entry, seen)) {
                return true;
            }
        }

        return false;
    } else if (isSet(value)) {
        for (const entry of value) {
            if (containsSharedMemory(entry, seen)) {
                return true;
            }
        }

        return false;
    }

    return Reflect.ownKeys(value).some((key) => containsSharedMemory(Reflect.get(value, key), seen));
}

function effectiveExpiryEpochMs(now: () => number, ttlMs: number): number {
    try {
        const nowEpochMs = currentEpochMs(now);

        const expiresAtEpochMs = nowEpochMs + ttlMs;

        if (
            typeof nowEpochMs !== "number"
            || !Number.isFinite(nowEpochMs)
            || !Number.isFinite(expiresAtEpochMs)
            || !Number.isFinite(new Date(expiresAtEpochMs).getTime())
        ) {
            throw new ValidationError("Contract cache expiry must be a finite valid date.");
        }

        return expiresAtEpochMs;
    } catch (error) {
        if (isValidationError(error)) {
            throw error;
        }

        throw new ValidationError("Contract cache expiry must be a finite valid date.");
    }
}

function currentEpochMs(now: () => number): number {
    try {
        const nowEpochMs = now();

        if (
            typeof nowEpochMs !== "number"
            || !Number.isFinite(nowEpochMs)
            || !Number.isFinite(new Date(nowEpochMs).getTime())
        ) {
            throw new ValidationError("Contract cache clock must return a finite valid date.");
        }

        return nowEpochMs;
    } catch (error) {
        if (isValidationError(error)) {
            throw error;
        }

        throw new ValidationError("Contract cache clock must return a finite valid date.");
    }
}

function isValidationError(value: unknown): value is ValidationError {
    try {
        return value instanceof ValidationError;
    } catch {
        return false;
    }
}

function isError(value: unknown): value is Error {
    try {
        return value instanceof Error;
    } catch {
        return false;
    }
}

function isUint8Array(value: unknown): value is Uint8Array {
    try {
        return value instanceof Uint8Array;
    } catch {
        return false;
    }
}

function isDate(value: unknown): value is Date {
    try {
        return value instanceof Date;
    } catch {
        return false;
    }
}

function isSharedArrayBuffer(value: unknown): value is SharedArrayBuffer {
    try {
        return typeof SharedArrayBuffer !== "undefined" && value instanceof SharedArrayBuffer;
    } catch {
        return false;
    }
}

function isMap(value: unknown): value is Map<unknown, unknown> {
    try {
        return value instanceof Map;
    } catch {
        return false;
    }
}

function isSet(value: unknown): value is Set<unknown> {
    try {
        return value instanceof Set;
    } catch {
        return false;
    }
}
