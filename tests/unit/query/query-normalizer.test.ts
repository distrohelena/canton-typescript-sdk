import { describe, expect, it } from "vitest";
import {
    normalizeAggregate,
    normalizeCount,
    normalizeFindMany,
    normalizeFindUnique,
    normalizeGroupBy,
} from "../../../src/query/canonical/query-normalizer.js";

describe("canonical query normalizer", () => {
    it("canonicalizes a contract query before it reaches a backend", () => {
        const query = normalizeFindMany("contracts", {
            parties: ["Bob", "Alice", "Alice"],
            where: {
                active: true,
                exercises: { some: { witnesses: { has: "Alice" } } },
            },
            orderBy: [{ createdAt: "desc" }],
            include: { exercises: { take: 25 } },
        });

        expect(query).toMatchObject({
            relation: "contracts",
            parties: ["Alice", "Bob"],
            activeOnly: true,
            orderBy: [
                { path: ["createdAt"], direction: "desc" },
                { path: ["contractId"], direction: "asc" },
            ],
        });
    });

    it.each([
        ["contracts", { where: { templateId: { moduleName: { like: "App%" } }, payload: { match: { owner: { city: { ilike: "A%" } } } } }, select: { contractId: true, json: { owner: { field: "payload", path: ["owner"], as: "text" } } }, include: { contractType: true, exercises: { take: 1 } }, orderBy: [{ createdAt: "desc" }] }],
        ["contractTypes", { where: { contracts: { some: { active: true } } }, select: { pk: true }, include: { contracts: { take: 1 } }, orderBy: [{ packageName: "asc" }] }],
        ["events", { where: { transaction: { effectiveAt: { gte: new Date(0) } } }, select: { eventId: true }, include: { transaction: true, exercises: { take: 1 } }, orderBy: [{ eventId: "asc" }] }],
        ["exercises", { where: { argument: { path: ["owner"], equals: "Alice" }, event: { pk: { equals: "1" } } }, select: { tpePk: true, json: { owner: { field: "argument", path: ["owner"], as: "text" } } }, include: { event: true, contract: true }, orderBy: [{ contractId: "asc" }] }],
        ["exerciseTypes", { where: { consuming: { equals: true } }, select: { pk: true }, include: { exercises: { take: 1 } }, orderBy: [{ choice: "asc" }] }],
        ["packages", { where: { id: { like: "pkg%" } }, select: { id: true }, include: { exercises: { take: 1 } }, orderBy: [{ name: "asc" }] }],
        ["transactions", { where: { traceContext: { path: ["traceId"], isNot: null }, events: { none: { type: { equals: "created" } } } }, select: { ix: true, json: { traceId: { field: "traceContext", path: ["traceId"], as: "text" } } }, include: { events: { take: 1 } }, orderBy: [{ effectiveAt: "desc" }] }],
        ["watermark", { where: { singleton: { equals: true } }, select: { offset: true }, orderBy: [{ ix: "desc" }] }],
    ] as const)("normalizes typed grammar for %s", (relation, args) => {
        expect(normalizeFindMany(relation, args)).toMatchObject({
            kind: "findMany",
            relation,
        });
    });

    it("normalizes unique, count, aggregate, and group operations", () => {
        expect(normalizeFindUnique("packages", { where: { id: "package-id" } })).toMatchObject({ kind: "findUnique", relation: "packages" });
        expect(normalizeCount("contracts", { parties: ["Bob", "Alice"], where: { active: true } })).toMatchObject({ kind: "count", parties: ["Alice", "Bob"], activeOnly: true });
        expect(normalizeAggregate("transactions", { count: true, sum: ["paidTrafficCost"] })).toMatchObject({ kind: "aggregate", aggregates: { count: true, sum: ["paidTrafficCost"] } });
        expect(normalizeGroupBy("events", { by: ["type", { transaction: { effectiveAt: { bucket: "day" } } }], aggregate: { count: true, sum: ["pk"] } })).toMatchObject({ kind: "groupBy", relation: "events" });
    });

    it("accepts aggregate selections for every public row field", () => {
        expect(normalizeAggregate("packages", {
            min: ["id"],
            max: ["name"],
            sum: ["version"],
        })).toMatchObject({
            aggregates: {
                min: ["id"],
                max: ["name"],
                sum: ["version"],
            },
        });
    });

    it.each([
        ["non-numeric group aggregate fields", () => normalizeGroupBy("packages", { by: ["id"], aggregate: { sum: ["name"] } })],
        ["payload in", () => normalizeFindMany("contracts", { where: { payload: { match: { owner: { in: ["Alice"] } } } } })],
        ["payload is", () => normalizeFindMany("contracts", { where: { payload: { match: { owner: { is: null } } } } })],
        ["payload isNot", () => normalizeFindMany("contracts", { where: { payload: { match: { owner: { isNot: null } } } } })],
        ["witnesses equality", () => normalizeFindMany("contracts", { where: { witnesses: { equals: ["Alice"] } } })],
        ["witnesses in", () => normalizeFindMany("contracts", { where: { witnesses: { in: [["Alice"]] } } })],
        ["witnesses is", () => normalizeFindMany("contracts", { where: { witnesses: { is: null } } })],
        ["witnesses isNot", () => normalizeFindMany("contracts", { where: { witnesses: { isNot: null } } })],
    ])("rejects restricted %s", (_name, normalize) => {
        expect(normalize).toThrow();
    });

    it.each([
        ["unknown fields", () => normalizeFindMany("packages", { where: { nope: { equals: "x" } } })],
        ["invalid operators", () => normalizeFindMany("packages", { where: { id: { contains: "x" } } })],
        ["empty order", () => normalizeFindMany("packages", { orderBy: [] })],
        ["multi-field order", () => normalizeFindMany("packages", { orderBy: [{ id: "asc", name: "desc" }] })],
        ["negative pages", () => normalizeFindMany("packages", { take: -1 })],
        ["empty selections", () => normalizeFindMany("packages", { select: { id: false } })],
        ["illegal relation quantifier", () => normalizeFindMany("contracts", { where: { contractType: { some: { pk: { equals: "1" } } } } })],
        ["unbounded to-many include", () => normalizeFindMany("contracts", { include: { exercises: true } })],
        ["operator-shaped unique values", () => normalizeFindUnique("packages", { where: { id: { contains: "x" } } })],
        ["unknown group aggregates", () => normalizeGroupBy("packages", { by: ["id"], aggregate: { average: ["pk"] } })],
        ["to-one include pages", () => normalizeFindMany("contracts", { include: { contractType: { take: 1 } } })],
    ])("rejects %s before I/O", (name, normalize) => {
        expect(normalize).toThrow(name === "unknown group aggregates" ? "average is not supported" : undefined);
    });
});
