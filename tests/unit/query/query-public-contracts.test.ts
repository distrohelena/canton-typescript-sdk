import { describe, expect, it, vi } from "vitest";
import { CantonError } from "../../../src/core/errors/canton-error.js";
import { MemoryQueryCache } from "../../../src/query/cache/memory-query-cache.js";
import { PqsQueryError } from "../../../src/query/errors/pqs-query-error.js";
import { QueryCapabilityError } from "../../../src/query/errors/query-capability-error.js";
import { QuerySnapshotIncompleteError, type QuerySnapshotIncompleteReason } from "../../../src/index.js";
import { type ContractCacheResult } from "../../../src/query/query-client.js";
import { QuerySource } from "../../../src/query/query-source.js";

describe("query public contracts", () => {
    it("names the available query sources", () => {
        expect(QuerySource.pqs).toBe("pqs");
        expect(QuerySource.grpc).toBe("grpc");
    });

    it("exposes source-switchable contract cache result branches", () => {
        const grpc: ContractCacheResult = {
            source: QuerySource.grpc,
            cached: true,
            activeAtOffset: "42",
            contractCount: 1,
            expiresAt: new Date(0),
        };

        const pqs: ContractCacheResult = { source: QuerySource.pqs, cached: false };

        expect(grpc.cached).toBe(true);
        expect(pqs.cached).toBe(false);
    });

    it("reports the selected source for unsupported operations", () => {
        const error = new QueryCapabilityError(
            QuerySource.grpc,
            "query.$queryRaw",
        );

        expect(error).toBeInstanceOf(CantonError);
        expect(error).toMatchObject({
            source: QuerySource.grpc,
            operation: "query.$queryRaw",
        });
    });

    it("exposes incomplete gRPC snapshot diagnostics", () => {
        const reason: QuerySnapshotIncompleteReason = "participant-pruned";

        const error = new QuerySnapshotIncompleteError({
            beginExclusive: "0",
            endInclusive: "42",
            reason,
        });

        expect(error).toBeInstanceOf(CantonError);
        expect(error).toMatchObject({
            beginExclusive: "0",
            endInclusive: "42",
            reason: "participant-pruned",
        });
    });

    it("expires memory cache entries", async () => {
        const now = vi.fn(() => 1_000);

        const cache = new MemoryQueryCache(now);

        await cache.setAsync("contracts", ["one"], 50);
        expect(await cache.getAsync<readonly string[]>("contracts")).toEqual([
            "one",
        ]);

        now.mockReturnValue(1_050);
        expect(await cache.getAsync("contracts")).toBeUndefined();
    });

    it("redacts PQS values from query errors", () => {
        const error = new PqsQueryError({
            operation: "contracts.findMany",
            code: "42P01",
            cause: new Error("database unavailable for postgres://secret@example"),
        });

        expect(error).toBeInstanceOf(CantonError);
        expect(error.operation).toBe("contracts.findMany");
        expect(error.code).toBe("42P01");
        expect(error.message).not.toContain("postgres://secret@example");
    });
});
