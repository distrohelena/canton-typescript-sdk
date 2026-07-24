import { describe, expect, it } from "vitest";
import { assertReadOnlySql } from "../../../src/query/pqs/read-only-sql.js";

describe("read-only SQL", () => {
    it.each([
        "select * from __contracts where contract_id = $1",
        "with contracts as (select * from __contracts) select * from contracts",
        "explain select * from __contracts",
        "show search_path",
    ])("accepts a read-only statement", (sql) => {
        expect(() => assertReadOnlySql(sql)).not.toThrow();
    });

    it.each([
        "insert into __contracts values ('x')",
        "select 1; delete from __contracts",
        "with changed as (delete from __contracts returning *) select * from changed",
    ])("rejects a mutating statement", (sql) => {
        expect(() => assertReadOnlySql(sql)).toThrow("read-only");
    });
});
