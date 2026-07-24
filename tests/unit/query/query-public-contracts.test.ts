import { describe, expect, it, vi } from "vitest";
import { CantonError } from "../../../src/core/errors/canton-error.js";
import { MemoryQueryCache } from "../../../src/query/cache/memory-query-cache.js";
import { PqsQueryError } from "../../../src/query/errors/pqs-query-error.js";
import { QueryCapabilityError } from "../../../src/query/errors/query-capability-error.js";
import { QuerySource } from "../../../src/query/query-source.js";

describe("query public contracts", () => {
    it("names the available query sources", () => {
        expect(QuerySource.pqs).toBe("pqs");
        expect(QuerySource.grpc).toBe("grpc");
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
