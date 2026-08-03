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

        expect(query).toEqual({
            kind: "findMany",
            relation: "contracts",
            parties: ["Alice", "Bob"],
            predicate: {
                kind: "and",
                children: [
                    { kind: "scalar", path: ["active"], operator: "equals", value: true },
                    { kind: "relation", edge: "exercises", quantifier: "some", predicate: { kind: "scalar", path: ["witnesses"], operator: "has", value: "Alice" } },
                ],
            },
            includes: [{
                edge: "exercises",
                relation: "exercises",
                cardinality: "many",
                includes: [],
                orderBy: [
                    { path: ["tpePk"], direction: "asc" },
                    { path: ["contractTpePk"], direction: "asc" },
                    { path: ["exerciseEventPk"], direction: "asc" },
                    { path: ["contractId"], direction: "asc" },
                ],
                predicate: undefined,
                select: undefined,
                skip: 0,
                take: 25,
            }],
            select: undefined,
            activeOnly: true,
            orderBy: [
                { path: ["createdAt"], direction: "desc" },
                { path: ["contractId"], direction: "asc" },
            ],
            skip: 0,
            take: undefined,
        });
    });

    it.each([
        ["and", { and: [{ active: true }, { contractId: { equals: "cid" } }] }, true],
        ["or branches all active", { or: [{ active: true }, { and: [{ active: true }, { contractId: { equals: "cid" } }] }] }, true],
        ["or branch without active", { or: [{ active: true }, { contractId: { equals: "cid" } }] }, false],
        ["not", { not: { active: true } }, false],
    ])("proves active-only only when %s", (_name, where, activeOnly) => {
        expect(normalizeFindMany("contracts", { where }).activeOnly).toBe(activeOnly);
    });

    it.each([
        ["contracts", "createdAt", "contractId"], ["contractTypes", "packageName", "pk"], ["events", "eventId", "pk"], ["exercises", "controllers", "contractId"],
        ["exerciseTypes", "choice", "pk"], ["packages", "name", "pk"], ["transactions", "effectiveAt", "ix"], ["watermark", "instanceId", "singleton"],
    ] as const)("adds stable final ordering for %s", (relation, orderField, finalField) => {
        const orderBy = normalizeFindMany(relation, { orderBy: [{ [orderField]: "desc" }] }).orderBy;

        expect(orderBy.at(-1)).toEqual({ path: [finalField], direction: "asc" });
    });

    it("copies and freezes a normalized plan", () => {
        const args = {
            parties: ["Bob", "Alice"],
            where: { contractId: { in: ["cid-1"] } },
            select: { json: { owner: { field: "payload", path: ["owner"], as: "text" } }, contractId: true },
            orderBy: [{ contractId: "asc" }],
        } as const;

        const query = normalizeFindMany("contracts", args);

        (args.parties as string[]).push("Mallory");
        (args.where.contractId.in as string[]).push("cid-2");
        (args.select.json.owner.path as string[]).push("city");

        expect(query).toMatchObject({
            parties: ["Alice", "Bob"],
            predicate: { value: ["cid-1"] },
            select: { json: [{ path: ["owner"] }] },
        });
        expect(Object.isFrozen(query)).toBe(true);
        expect(Object.isFrozen(query.orderBy)).toBe(true);
        expect(Object.isFrozen(query.orderBy[0])).toBe(true);
        expect(Object.isFrozen(query.orderBy[0].path)).toBe(true);
        expect(Object.isFrozen(query.predicate)).toBe(true);
        expect(Object.isFrozen((query.predicate as { readonly value: readonly string[] }).value)).toBe(true);
        expect(Object.isFrozen(query.select)).toBe(true);
        expect(Object.isFrozen(query.select?.json)).toBe(true);
    });

    it.each(["toString", "constructor", "__proto__"])("rejects inherited key %s with a validation error", (key) => {
        const where = Object.create(null) as Record<string, unknown>;

        where[key] = { equals: "x" };

        expect(() => normalizeFindMany("packages", { where })).toThrow(`${key} is not a field of packages`);
        try {
            normalizeFindMany("packages", { where });
        } catch (error) {
            expect(error).toMatchObject({ name: "QueryValidationError", message: `${key} is not a field of packages` });
        }
    });

    it("rejects inherited payload, page, and bucket grammar", () => {
        const payload = Object.create({ match: { owner: { equals: "Alice" } } }) as Record<string, unknown>;

        payload.toString = true;

        const page = Object.create({ take: 1 }) as Record<string, unknown>;

        const timeBucket = Object.create({ bucket: "day" }) as Record<string, unknown>;

        expect(() => normalizeFindMany("contracts", { where: { payload } })).toThrow();
        expect(() => normalizeFindMany("contracts", { include: { exercises: page } })).toThrow();
        expect(() => normalizeGroupBy("transactions", { by: [{ effectiveAt: timeBucket }], aggregate: { count: true } })).toThrow();
    });

    it.each([
        ["top-level args", () => normalizeFindMany("packages", Object.create({ where: { id: { equals: "pkg" } } }))],
        ["JSON filter path", () => {
            const filter = Object.create({ path: ["trace"] }) as Record<string, unknown>;

            filter.equals = "trace-id";

            return normalizeFindMany("transactions", { where: { traceContext: filter } });
        }],
        ["JSON projection path", () => {
            const projection = Object.create({ path: ["trace"] }) as Record<string, unknown>;

            projection.field = "traceContext";
            projection.as = "text";

            return normalizeFindMany("transactions", { select: { json: { trace: projection } } });
        }],
        ["aggregate fields", () => normalizeAggregate("packages", Object.create({ sum: ["pk"] }))],
        ["include clauses", () => normalizeFindMany("contracts", { include: Object.create({ exercises: { take: 1 } }) })],
        ["witnesses has", () => {
            const filter = Object.create({ has: "Alice" }) as Record<string, unknown>;

            filter.unrelated = true;

            return normalizeFindMany("contracts", { where: { witnesses: filter } });
        }],
    ])("rejects inherited %s grammar with QueryValidationError", (_name, normalize) => {
        try {
            normalize();
        } catch (error) {
            expect(error).toMatchObject({ name: "QueryValidationError" });

            return;
        }

        throw new Error("expected validation failure");
    });

    it("canonicalizes mutable timestamp and binary literals into immutable values", () => {
        const timestamp = new Date("2026-08-03T00:00:00.000Z");

        const hash = new Uint8Array([1, 2]);

        const timestampQuery = normalizeFindMany("transactions", { where: { effectiveAt: { equals: timestamp } } });

        const binaryQuery = normalizeFindMany("transactions", { where: { externalTransactionHash: { equals: hash } } });

        const normalizedTimestamp = (timestampQuery.predicate as { readonly value: unknown }).value;

        const normalizedHash = (binaryQuery.predicate as { readonly value: readonly number[] }).value;

        timestamp.setTime(0);
        hash[0] = 9;

        expect(normalizedTimestamp).toBe("2026-08-03T00:00:00.000Z");
        expect(normalizedHash).toEqual([1, 2]);
        expect(Object.isFrozen(normalizedHash)).toBe(true);
    });

    it.each([
        ["plain scalar instead of filter", () => normalizeFindMany("packages", { where: { id: "pkg" } })],
        ["string pattern number", () => normalizeFindMany("packages", { where: { id: { like: 1 } } })],
        ["numeric string number", () => normalizeFindMany("packages", { where: { pk: { equals: 1 } } })],
        ["boolean string", () => normalizeFindMany("contracts", { where: { active: { equals: "true" } } })],
        ["timestamp string", () => normalizeFindMany("transactions", { where: { effectiveAt: { gt: "today" } } })],
        ["JSON path number", () => normalizeFindMany("transactions", { where: { traceContext: { path: ["trace"], equals: 1 } } })],
        ["array member number", () => normalizeFindMany("contractTypes", { where: { aliases: { has: 1 } } })],
        ["null for required field", () => normalizeFindMany("packages", { where: { id: { is: null } } })],
        ["invalid in item", () => normalizeFindMany("packages", { where: { id: { in: ["pkg", 1] } } })],
    ])("rejects invalid runtime scalar %s", (_name, normalize) => {
        expect(normalize).toThrow();
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
