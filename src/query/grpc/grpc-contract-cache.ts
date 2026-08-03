import { ValidationError } from "../../core/errors/validation-error.js";
import { StateServiceClient } from "../../services/state/state-service-client.js";
import type { GetActiveContractsResponse } from "../../transports/grpc/generated/canton/com/daml/ledger/api/v2/state_service.js";
import { mapGrpcQueryContractsRequest } from "../../transports/grpc/mappers/contracts-mapper.js";
import { QueryCacheStore } from "../cache/query-cache-store.js";
import { ContractRow } from "../model-types.js";
import { ContractCacheArgs, ContractCacheResult } from "../query-client.js";
import { QuerySource } from "../query-source.js";
import { mapGrpcQueryRelationFragment } from "./grpc-relation-mapper.js";

type ActiveContractsReader = Pick<StateServiceClient, "getActiveContractsPageAsync">;

interface CachedContractSnapshot {
    readonly version: 1;
    readonly endpointScope: string;
    readonly parties: readonly string[] | undefined;
    readonly activeAtOffset: string;
    readonly expiresAtEpochMs: number;
    readonly contracts: readonly ContractRow[];
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

        const nowEpochMs = currentEpochMs(this.now);

        const snapshot = asCompatibleSnapshot(cached, this.endpointScope, parties, nowEpochMs);

        if (snapshot === undefined) {
            return undefined;
        }

        return snapshot.contracts;
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
        const activeContracts: GetActiveContractsResponse[] = [];

        const seenPageTokens = new Set<string>();

        let activeAtOffset: string | undefined;

        let pageToken: Uint8Array | undefined;

        do {
            const page = materializeActiveContractsPage(
                await this.stateService.getActiveContractsPageAsync(
                    mapGrpcQueryContractsRequest(
                        parties === undefined
                            ? { allParties: true, activeAtOffset, pageToken }
                            : { parties, activeAtOffset, pageToken },
                    ),
                ),
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

        const contracts = mapGrpcQueryRelationFragment([], activeContracts).contracts;

        const expiresAtEpochMs = effectiveExpiryEpochMs(this.now, this.ttlMs);

        const result: ContractCacheResult = {
            source: QuerySource.grpc,
            cached: true,
            activeAtOffset: activeAtOffset!,
            contractCount: contracts.length,
            expiresAt: new Date(expiresAtEpochMs),
        };

        const snapshot: CachedContractSnapshot = {
            version: 1,
            endpointScope: this.endpointScope,
            parties,
            activeAtOffset: activeAtOffset!,
            expiresAtEpochMs,
            contracts: copyRows(contracts),
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

function asCompatibleSnapshot(
    value: unknown,
    endpointScope: string,
    parties: readonly string[] | undefined,
    nowEpochMs: number,
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

        if (
            version !== 1
            || storedEndpointScope !== endpointScope
            || (rawParties !== undefined && storedParties === undefined)
            || !sameParties(storedParties, parties)
            || typeof nowEpochMs !== "number"
            || !Number.isFinite(nowEpochMs)
            || !Number.isFinite(new Date(nowEpochMs).getTime())
            || typeof activeAtOffset !== "string"
            || activeAtOffset.trim().length === 0
            || typeof expiresAtEpochMs !== "number"
            || !Number.isFinite(expiresAtEpochMs)
            || !Number.isFinite(new Date(expiresAtEpochMs).getTime())
            || expiresAtEpochMs <= nowEpochMs
            || contracts === undefined
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

        if (typeof activeAtOffset !== "string" || activeAtOffset.trim().length === 0) {
            throw new Error("Active-contracts response is missing activeAtOffset.");
        }

        const activeContracts = materializeIndexedArray(candidate.activeContracts);

        if (activeContracts === undefined) {
            throw new Error("Active-contracts response activeContracts is invalid.");
        }

        const materializedActiveContracts = activeContracts.map(materializeActiveContractResponse);

        const nextPageToken = materializePageToken(candidate.nextPageToken);

        return {
            activeAtOffset,
            activeContracts: materializedActiveContracts,
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
    } else if (!isUint8Array(value)) {
        throw new Error("Active-contracts response nextPageToken is invalid.");
    }

    const length = value.length;

    if (!Number.isSafeInteger(length) || length < 0) {
        throw new Error("Active-contracts response nextPageToken is invalid.");
    }

    const token = new Uint8Array(length);

    for (let index = 0; index < length; index += 1) {
        token[index] = value[index]!;
    }

    return token;
}

function materializeContractRows(value: unknown): readonly ContractRow[] | undefined {
    const values = materializeIndexedArray(value);

    if (values === undefined) {
        return undefined;
    }

    const rows = values.map(materializeContractRow);

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
    if (!Array.isArray(value)) {
        return undefined;
    }

    const length = value.length;

    if (!Number.isSafeInteger(length) || length < 0) {
        return undefined;
    }

    const values: unknown[] = [];

    for (let index = 0; index < length; index += 1) {
        values.push(value[index]);
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
