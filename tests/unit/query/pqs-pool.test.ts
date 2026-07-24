import { describe, expect, it, vi } from "vitest";
import { PqsPool } from "../../../src/query/pqs/pqs-pool.js";

describe("PQS pool", () => {
    it("ends its owned pool only once", async () => {
        const end = vi.fn().mockResolvedValue(undefined);
        const pool = new PqsPool({ end } as never);

        await pool.disposeAsync();
        await pool.disposeAsync();

        expect(end).toHaveBeenCalledOnce();
    });
});
