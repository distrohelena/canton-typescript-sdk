import { describe, expect, it } from "vitest";
import { assertQueryOrderBy } from "../../../src/query/model-types.js";
import type { ContractWhere, PackageWhere } from "../../../src/query/model-types.js";

const contractFilter: ContractWhere = {
    and: [
        { createdEventOffset: { gte: "100" } },
        { payload: { path: "owner.city", ilike: "new%" } },
        { not: { active: { equals: false } } },
    ],
};

const packageFilter: PackageWhere = {
    or: [{ name: { like: "app%" } }, { pk: { lt: "10" } }],
};

// @ts-expect-error Numeric string fields do not support pattern predicates.
const invalidNumericPattern: PackageWhere = { pk: { like: "1%" } };
// @ts-expect-error Boolean fields do not support ordered predicates.
const invalidBooleanRange: ContractWhere = { active: { gt: true } };

void contractFilter;
void packageFilter;
void invalidNumericPattern;
void invalidBooleanRange;

describe("generic query delegates", () => {
    it("requires exactly one ordering field", () => {
        expect(() => assertQueryOrderBy({ id: "asc", name: "desc" })).toThrow(
            "orderBy must specify exactly one field",
        );
        expect(() => assertQueryOrderBy({ id: "asc" })).not.toThrow();
    });
});
