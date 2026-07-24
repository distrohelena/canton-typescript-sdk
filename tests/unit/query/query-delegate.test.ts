import { describe, expect, it } from "vitest";
import { assertQueryOrderBy } from "../../../src/query/model-types.js";

describe("generic query delegates", () => {
    it("requires exactly one ordering field", () => {
        expect(() => assertQueryOrderBy({ id: "asc", name: "desc" })).toThrow(
            "orderBy must specify exactly one field",
        );
        expect(() => assertQueryOrderBy({ id: "asc" })).not.toThrow();
    });
});
