import { ValidationError } from "../../core/errors/validation-error.js";
import { StateServiceClient } from "../../services/state/state-service-client.js";
import { mapGrpcQueryContractsRequest } from "../../transports/grpc/mappers/contracts-mapper.js";
import { QueryCacheStore } from "../cache/query-cache-store.js";
import { ContractRow } from "../model-types.js";
import { ContractCacheArgs, ContractCacheResult } from "../query-client.js";
import { QuerySource } from "../query-source.js";

type ActiveContractsReader = Pick<StateServiceClient, "getActiveContractsPageAsync">;

interface CachedContractSnapshot {
    readonly version: 1;
    readonly endpointScope: string;
    readonly parties: readonly string[] | undefined;
    readonly activeAtOffset: string;
    readonly expiresAtEpochMs: number;
    readonly contracts: readonly ContractRow[];
}

export class GrpcContractCache {
    private readonly inflight = new Map<string, Promise<ContractCacheResult>>();

    public constructor(
        private readonly stateService: ActiveContractsReader,
        private readonly store: QueryCacheStore,
        private readonly ttlMs: number,
        private readonly endpointScope: string,
        private readonly now: () => number = Date.now,
    ) {
        if (!Number.isFinite(ttlMs) || ttlMs <= 0) {
            throw new ValidationError("Contract cache ttlMs must be a positive finite number.");
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
        const parties = normalizeParties(args);

        const cached = await this.store.getAsync<unknown>(cacheKey(this.endpointScope, parties));

        const snapshot = asCompatibleSnapshot(cached, this.endpointScope, parties, this.now());

        if (snapshot === undefined) {
            return undefined;
        }

        try {
            return copyRows(snapshot.contracts);
        } catch {
            return undefined;
        }
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

    private async populateAsync(
        parties: readonly string[] | undefined,
        key: string,
    ): Promise<ContractCacheResult> {
        const contracts: ContractRow[] = [];

        const seenPageTokens = new Set<string>();

        let activeAtOffset: string | undefined;

        let pageToken: Uint8Array | undefined;

        do {
            const response = await this.stateService.getActiveContractsPageAsync(
                mapGrpcQueryContractsRequest(
                    parties === undefined
                        ? { allParties: true, activeAtOffset, pageToken }
                        : { parties, activeAtOffset, pageToken },
                ),
            );

            if (typeof response.activeAtOffset !== "string" || response.activeAtOffset.trim().length === 0) {
                throw new Error("Active-contracts response is missing activeAtOffset.");
            } else if (activeAtOffset === undefined) {
                activeAtOffset = response.activeAtOffset;
            } else if (activeAtOffset !== response.activeAtOffset) {
                throw new Error("Active-contracts response activeAtOffset changed during traversal.");
            }

            contracts.push(...response.activeContracts.map(mapGrpcContract));
            pageToken = response.nextPageToken;

            if (pageToken !== undefined && pageToken.length > 0) {
                const tokenKey = Array.from(pageToken).join(",");

                if (seenPageTokens.has(tokenKey)) {
                    throw new Error("Active-contracts response repeated a page token.");
                }

                seenPageTokens.add(tokenKey);
            }
        } while (pageToken !== undefined && pageToken.length > 0);

        const expiresAtEpochMs = effectiveExpiryEpochMs(this.now, this.ttlMs);

        const snapshot: CachedContractSnapshot = {
            version: 1,
            endpointScope: this.endpointScope,
            parties,
            activeAtOffset: activeAtOffset!,
            expiresAtEpochMs,
            contracts: copyRows(contracts),
        };

        await this.store.setAsync(key, snapshot, this.ttlMs);

        return {
            source: QuerySource.grpc,
            cached: true,
            activeAtOffset: snapshot.activeAtOffset,
            contractCount: snapshot.contracts.length,
            expiresAt: new Date(expiresAtEpochMs),
        };
    }

    private clearInflight(key: string, promise: Promise<ContractCacheResult>): void {
        if (this.inflight.get(key) === promise) {
            this.inflight.delete(key);
        }
    }
}

export function normalizeParties(args?: ContractCacheArgs): readonly string[] | undefined {
    try {
        if (args === undefined || args.parties === undefined) {
            return undefined;
        }

        const candidate = args.parties;

        if (!Array.isArray(candidate) || candidate.length === 0) {
            throw new ValidationError("Contract cache parties must contain non-empty strings.");
        }

        const parties = candidate.map((party) => {
            if (typeof party !== "string" || party.trim().length === 0) {
                throw new ValidationError("Contract cache parties must contain non-empty strings.");
            }

            return party;
        });

        return Object.freeze([...new Set(parties)].sort());
    } catch (error) {
        if (error instanceof ValidationError) {
            throw error;
        }

        throw new ValidationError("Contract cache parties must be a non-empty array of strings when provided.");
    }
}

function cacheKey(endpointScope: string, parties: readonly string[] | undefined): string {
    return `grpc-contract-cache:v1:${JSON.stringify([endpointScope, parties])}`;
}

function asCompatibleSnapshot(
    value: unknown,
    endpointScope: string,
    parties: readonly string[] | undefined,
    now: number,
): CachedContractSnapshot | undefined {
    try {
        if (value === null || typeof value !== "object") {
            return undefined;
        }

        const snapshot = value as Partial<CachedContractSnapshot>;

        if (
            snapshot.version !== 1
            || snapshot.endpointScope !== endpointScope
            || !sameParties(snapshot.parties, parties)
            || typeof now !== "number"
            || !Number.isFinite(now)
            || !Number.isFinite(new Date(now).getTime())
            || typeof snapshot.activeAtOffset !== "string"
            || snapshot.activeAtOffset.trim().length === 0
            || typeof snapshot.expiresAtEpochMs !== "number"
            || !Number.isFinite(snapshot.expiresAtEpochMs)
            || !Number.isFinite(new Date(snapshot.expiresAtEpochMs).getTime())
            || snapshot.expiresAtEpochMs <= now
            || !Array.isArray(snapshot.contracts)
            || !snapshot.contracts.every(isActiveContractRow)
        ) {
            return undefined;
        }

        return snapshot as CachedContractSnapshot;
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

function isActiveContractRow(value: unknown): value is ContractRow {
    if (value === null || typeof value !== "object") {
        return false;
    }

    const row = value as Partial<ContractRow>;

    return typeof row.contractId === "string"
        && row.templateId !== null
        && typeof row.templateId === "object"
        && typeof row.templateId.packageId === "string"
        && typeof row.templateId.moduleName === "string"
        && typeof row.templateId.entityName === "string"
        && (typeof row.packageId === "string" || row.packageId === null)
        && Array.isArray(row.witnesses)
        && row.witnesses.every((witness) => typeof witness === "string")
        && typeof row.createdEventOffset === "string"
        && (row.createdAt === null || isValidDate(row.createdAt))
        && row.archivedEventOffset === null
        && row.archivedAt === null
        && row.active === true;
}

function isValidDate(value: unknown): value is Date {
    return value instanceof Date && Number.isFinite(value.getTime());
}

function mapGrpcContract(value: unknown): ContractRow {
    const entry = value as { contractEntry?: { oneofKind?: string; activeContract?: unknown } };

    if (entry.contractEntry?.oneofKind !== "activeContract") {
        throw new Error("Active-contracts response contains a non-active contract entry.");
    }

    const contract = entry.contractEntry.activeContract as {
        contractId?: unknown;
        templateId?: { packageId?: unknown; moduleName?: unknown; entityName?: unknown };
        payload?: unknown;
    } | undefined;

    const template = contract?.templateId;

    if (
        typeof contract?.contractId !== "string"
        || typeof template?.packageId !== "string"
        || typeof template.moduleName !== "string"
        || typeof template.entityName !== "string"
    ) {
        throw new Error("Active-contracts response contains an invalid contract.");
    }

    return {
        contractId: contract.contractId,
        templateId: { packageId: template.packageId, moduleName: template.moduleName, entityName: template.entityName },
        packageId: null,
        payload: copyValue(contract.payload),
        witnesses: [],
        createdEventOffset: "",
        createdAt: null,
        archivedEventOffset: null,
        archivedAt: null,
        active: true,
    };
}

function copyRows(rows: readonly ContractRow[]): readonly ContractRow[] {
    return rows.map((row) => ({
        ...row,
        templateId: { ...row.templateId },
        payload: copyValue(row.payload),
        witnesses: [...row.witnesses],
        createdAt: row.createdAt === null ? null : new Date(row.createdAt),
        archivedAt: row.archivedAt === null ? null : new Date(row.archivedAt),
    }));
}

function copyValue(value: unknown): unknown {
    if (value === undefined || value === null || typeof value !== "object") {
        return value;
    }

    return structuredClone(value);
}

function effectiveExpiryEpochMs(now: () => number, ttlMs: number): number {
    try {
        const nowEpochMs = now();

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
        if (error instanceof ValidationError) {
            throw error;
        }

        throw new ValidationError("Contract cache expiry must be a finite valid date.");
    }
}
