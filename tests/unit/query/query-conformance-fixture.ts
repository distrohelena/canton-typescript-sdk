import { normalizeAggregate, normalizeFindMany, normalizeGroupBy } from "../../../src/query/canonical/query-normalizer.js";
import type { QueryDataset } from "../../../src/query/canonical/query-dataset.js";

function deepFreeze<T>(value: T): T {
    if (value === null || typeof value !== "object" || Object.isFrozen(value)) {
        return value;
    }

    for (const child of Object.values(value as Record<string, unknown>)) {
        deepFreeze(child);
    }

    return Object.freeze(value);
}

/** A deliberately small, immutable relational corpus shared by canonical evaluators. */
export const queryConformanceDataset: QueryDataset = deepFreeze({
    rows: Object.freeze({
        packages: Object.freeze([{ pk: "1", name: "app", version: "1", id: "pkg-app" }, { pk: "2", name: "app_%", version: "2", id: "pkg-other" }]),
        contractTypes: Object.freeze([
            { pk: "10", payloadType: "record", aliases: ["App:Asset"], packageName: "app", moduleName: "App", entityName: "Asset", templateFqn: "pkg-app:App:Asset" },
            { pk: "20", payloadType: "record", aliases: ["Other:Note"], packageName: "other", moduleName: "Other", entityName: "Note", templateFqn: "pkg-other:Other:Note" },
        ]),
        transactions: Object.freeze([
            { ix: "100", offset: "100", transactionId: "tx-1", effectiveAt: new Date("2026-01-05T10:15:00.000Z"), workflowId: null, domainId: "domain", traceContext: { traceId: "a" }, externalTransactionHash: null, paidTrafficCost: "7" },
            { ix: "200", offset: "200", transactionId: "tx-2", effectiveAt: new Date("2026-01-06T10:15:00.000Z"), workflowId: "wf", domainId: "domain", traceContext: { traceId: "b" }, externalTransactionHash: null, paidTrafficCost: "9007199254740993" },
            { ix: "300", offset: "300", transactionId: "tx-3", effectiveAt: null, workflowId: null, domainId: null, traceContext: null, externalTransactionHash: null, paidTrafficCost: null },
        ]),
        contracts: Object.freeze([
            { contractId: "C1", templateId: { packageId: "pkg-app", moduleName: "App", entityName: "Asset" }, packageId: "pkg-app", payload: { owner: "Alice", amount: "10", enabled: true, when: "2026-01-05T10:15:00.000Z" }, witnesses: ["Alice", "Bob"], createdEventOffset: "100", createdAt: new Date("2026-01-05T10:15:00.000Z"), archivedEventOffset: null, archivedAt: null, active: true },
            { contractId: "C2", templateId: { packageId: "pkg-app", moduleName: "App", entityName: "Asset" }, packageId: "pkg-app", payload: { owner: "Bob", amount: "20", enabled: false }, witnesses: ["Bob"], createdEventOffset: "200", createdAt: new Date("2026-01-06T10:15:00.000Z"), archivedEventOffset: "300", archivedAt: new Date("2026-01-07T10:15:00.000Z"), active: false },
            { contractId: "C3", templateId: { packageId: "pkg-other", moduleName: "Other", entityName: "Note" }, packageId: null, payload: { owner: "ALICE", amount: null }, witnesses: [], createdEventOffset: "200", createdAt: null, archivedEventOffset: null, archivedAt: null, active: true },
        ]),
        events: Object.freeze([{ pk: "1000", txIx: "100", eventId: "ev-created-1", type: "created" }, { pk: "2000", txIx: "200", eventId: "ev-exercised-1", type: "exercised" }, { pk: "3000", txIx: "200", eventId: "ev-created-2", type: "created" }]),
        exerciseTypes: Object.freeze([{ pk: "1", choice: "Archive", consuming: true, aliases: [], packageName: "app", moduleName: "App", entityName: "Asset", templateFqn: "pkg-app:App:Asset", choiceFqn: "pkg-app:App:Asset:Archive" }, { pk: "2", choice: "Transfer", consuming: false, aliases: [], packageName: "app", moduleName: "App", entityName: "Asset", templateFqn: "pkg-app:App:Asset", choiceFqn: "pkg-app:App:Asset:Transfer" }]),
        exercises: Object.freeze([{ tpePk: "1", contractTpePk: "10", exerciseEventPk: "2000", exercisedAtIx: "200", contractId: "C2", argument: { by: "Bob" }, result: {}, redactionId: null, packagePk: "1", controllers: ["Bob"], lastDescendantNodeId: "0", witnesses: ["Bob"] }, { tpePk: "2", contractTpePk: "10", exerciseEventPk: null, exercisedAtIx: "100", contractId: "C1", argument: { by: "Alice" }, result: { ok: true }, redactionId: null, packagePk: "1", controllers: ["Alice"], lastDescendantNodeId: "0", witnesses: ["Alice"] }]),
        watermark: Object.freeze([{ singleton: true, ix: "300", offset: "300", instanceId: "instance" }]),
    }),
    edges: Object.freeze({
        contracts: Object.freeze({ contractType: { from: ["templateId.packageId", "templateId.moduleName", "templateId.entityName"], to: ["packageId", "moduleName", "entityName"] }, createdTransaction: { from: ["createdEventOffset"], to: ["ix"] }, archivedTransaction: { from: ["archivedEventOffset"], to: ["ix"] }, exercises: { from: ["contractId"], to: ["contractId"] } }),
        contractTypes: Object.freeze({ contracts: { from: ["packageId", "moduleName", "entityName"], to: ["templateId.packageId", "templateId.moduleName", "templateId.entityName"] }, exercises: { from: ["pk"], to: ["contractTpePk"] } }),
        events: Object.freeze({ transaction: { from: ["txIx"], to: ["ix"] }, exercises: { from: ["pk"], to: ["exerciseEventPk"] } }),
        exercises: Object.freeze({ exerciseType: { from: ["tpePk"], to: ["pk"] }, contractType: { from: ["contractTpePk"], to: ["pk"] }, event: { from: ["exerciseEventPk"], to: ["pk"] }, transaction: { from: ["exercisedAtIx"], to: ["ix"] }, package: { from: ["packagePk"], to: ["pk"] }, contract: { from: ["contractId"], to: ["contractId"] } }),
        exerciseTypes: Object.freeze({ exercises: { from: ["pk"], to: ["tpePk"] } }), packages: Object.freeze({ exercises: { from: ["pk"], to: ["packagePk"] } }),
        transactions: Object.freeze({ events: { from: ["ix"], to: ["txIx"] }, createdContracts: { from: ["ix"], to: ["createdEventOffset"] }, archivedContracts: { from: ["ix"], to: ["archivedEventOffset"] }, exercises: { from: ["ix"], to: ["exercisedAtIx"] } }), watermark: Object.freeze({}),
    }),
    sourceLocalKeys: Object.freeze({ contracts: [["contractId"]], contractTypes: [["pk"]], events: [["pk"]], exercises: [["tpePk", "contractTpePk", "exerciseEventPk", "contractId"]], exerciseTypes: [["pk"]], packages: [["pk"]], transactions: [["ix"]], watermark: [["singleton"]] }),
});

export const evaluatorCases = Object.freeze([
    { name: "scalar, JSON, array, and relation predicates", query: normalizeFindMany("contracts", { where: { and: [{ contractId: { like: "C_" } }, { payload: { match: { owner: { ilike: "ali%" } } } }, { witnesses: { has: "Alice" } }, { exercises: { some: { controllers: { has: "Alice" } } } }] }, select: { contractId: true }, orderBy: [{ contractId: "asc" }] }), expected: [{ contractId: "C1" }] },
    { name: "range predicates compare UTC timestamps", query: normalizeFindMany("transactions", { where: { effectiveAt: { gte: new Date("2026-01-06T00:00:00.000Z") } }, select: { ix: true }, orderBy: [{ ix: "asc" }] }), expected: [{ ix: "200" }] },
    { name: "packages use scalar equality and in", query: normalizeFindMany("packages", { where: { and: [{ id: { in: ["pkg-app"] } }, { pk: { equals: "1" } }] }, select: { id: true } }), expected: [{ id: "pkg-app" }] },
    { name: "nested and or not and ilike predicates", query: normalizeFindMany("packages", { where: { and: [{ or: [{ name: { ilike: "APP%" } }, { id: { equals: "nope" } }] }, { not: { version: { equals: "2" } } }] }, select: { id: true } }), expected: [{ id: "pkg-app" }] },
    { name: "like honors SQL percent underscore escapes", query: normalizeFindMany("packages", { where: { name: { like: "app\\_\\%" } }, select: { id: true } }), expected: [{ id: "pkg-other" }] },
    { name: "contract types use array membership", query: normalizeFindMany("contractTypes", { where: { aliases: { has: "App:Asset" } }, select: { pk: true } }), expected: [{ pk: "10" }] },
    { name: "events traverse a to-one relation", query: normalizeFindMany("events", { where: { transaction: { domainId: { equals: "domain" } } }, select: { eventId: true }, orderBy: [{ pk: "asc" }] }), expected: [{ eventId: "ev-created-1" }, { eventId: "ev-exercised-1" }, { eventId: "ev-created-2" }] },
    { name: "exercises filter JSON paths", query: normalizeFindMany("exercises", { where: { argument: { path: ["by"], equals: "Alice" } }, select: { tpePk: true, json: { owner: { field: "argument", path: ["by"], as: "text" } } } }), expected: [{ tpePk: "2", owner: "Alice" }] },
    { name: "exercise types filter booleans", query: normalizeFindMany("exerciseTypes", { where: { consuming: { equals: true } }, select: { choice: true } }), expected: [{ choice: "Archive" }] },
    { name: "watermark supports null predicates", query: normalizeFindMany("watermark", { where: { instanceId: { isNot: null } }, select: { offset: true } }), expected: [{ offset: "300" }] },
    { name: "null is predicates exclude present values", query: normalizeFindMany("transactions", { where: { workflowId: { is: null } }, select: { ix: true }, orderBy: [{ ix: "asc" }] }), expected: [{ ix: "100" }, { ix: "300" }] },
    { name: "relation none filters all related rows", query: normalizeFindMany("transactions", { where: { events: { none: { type: { equals: "created" } } } }, select: { ix: true } }), expected: [{ ix: "300" }] },
    { name: "none and every use vacuous truth", query: normalizeFindMany("contracts", { where: { exercises: { every: { controllers: { has: "Alice" } } } }, select: { contractId: true }, orderBy: [{ contractId: "asc" }] }), expected: [{ contractId: "C1" }, { contractId: "C3" }] },
    { name: "null ordering and bounded include", query: normalizeFindMany("contracts", { orderBy: [{ createdAt: "asc" }], take: 2, select: { contractId: true }, include: { exercises: { take: 1, select: { tpePk: true } } } }), expected: [{ contractId: "C1", exercises: [{ tpePk: "2" }] }, { contractId: "C2", exercises: [{ tpePk: "1" }] }] },
    { name: "typed JSON projections and nested bounded includes", query: normalizeFindMany("contracts", { where: { contractId: { equals: "C1" } }, select: { json: { owner: { field: "payload", path: ["owner"], as: "text" }, amount: { field: "payload", path: ["amount"], as: "numeric" }, enabled: { field: "payload", path: ["enabled"], as: "boolean" }, when: { field: "payload", path: ["when"], as: "timestamp" } } }, include: { exercises: { take: 1, include: { package: { select: { id: true } } } } } }), expected: [{ owner: "Alice", amount: "10", enabled: true, when: new Date("2026-01-05T10:15:00.000Z"), exercises: [{ tpePk: "2", contractTpePk: "10", exerciseEventPk: null, exercisedAtIx: "100", contractId: "C1", argument: { by: "Alice" }, result: { ok: true }, redactionId: null, packagePk: "1", controllers: ["Alice"], lastDescendantNodeId: "0", witnesses: ["Alice"], package: { id: "pkg-app" } }] }] },
    { name: "stable descending order and pagination", query: normalizeFindMany("packages", { orderBy: [{ name: "desc" }], skip: 1, take: 1, select: { id: true } }), expected: [{ id: "pkg-app" }] },
    { name: "aggregates use lossless decimal strings", query: normalizeAggregate("transactions", { count: true, min: ["paidTrafficCost"], max: ["paidTrafficCost"], sum: ["paidTrafficCost"] }), expected: { count: 3, min: { paidTrafficCost: "7" }, max: { paidTrafficCost: "9007199254740993" }, sum: { paidTrafficCost: "9007199254741000" } } },
    { name: "empty aggregates retain count and null min max sum", query: normalizeAggregate("transactions", { where: { ix: { gt: "999" } }, count: true, min: ["paidTrafficCost"], max: ["paidTrafficCost"], sum: ["paidTrafficCost"] }), expected: { count: 0, min: { paidTrafficCost: null }, max: { paidTrafficCost: null }, sum: { paidTrafficCost: null } } },
    { name: "UTC day groups", query: normalizeGroupBy("transactions", { by: [{ effectiveAt: { bucket: "day" } }], aggregate: { count: true, sum: ["paidTrafficCost"] } }), expected: [{ effectiveAt_day: new Date("2026-01-05T00:00:00.000Z"), count: 1, sum_paidTrafficCost: "7" }, { effectiveAt_day: new Date("2026-01-06T00:00:00.000Z"), count: 1, sum_paidTrafficCost: "9007199254740993" }, { effectiveAt_day: null, count: 1, sum_paidTrafficCost: null }] },
    { name: "UTC hour groups", query: normalizeGroupBy("transactions", { by: [{ effectiveAt: { bucket: "hour" } }], aggregate: { count: true } }), expected: [{ effectiveAt_hour: new Date("2026-01-05T10:00:00.000Z"), count: 1 }, { effectiveAt_hour: new Date("2026-01-06T10:00:00.000Z"), count: 1 }, { effectiveAt_hour: null, count: 1 }] },
    { name: "PostgreSQL Monday week groups", query: normalizeGroupBy("transactions", { by: [{ effectiveAt: { bucket: "week" } }], aggregate: { count: true } }), expected: [{ effectiveAt_week: new Date("2026-01-05T00:00:00.000Z"), count: 2 }, { effectiveAt_week: null, count: 1 }] },
    { name: "UTC month groups", query: normalizeGroupBy("transactions", { by: [{ effectiveAt: { bucket: "month" } }], aggregate: { count: true } }), expected: [{ effectiveAt_month: new Date("2026-01-01T00:00:00.000Z"), count: 2 }, { effectiveAt_month: null, count: 1 }] },
    { name: "groups scalar array and JSON values", query: normalizeGroupBy("contracts", { by: ["witnesses", { payload: { name: "owner", path: ["owner"], as: "text" } }], aggregate: { count: true } }), expected: [{ witnesses: "Alice", owner: "Alice", count: 1 }, { witnesses: "Bob", owner: "Alice", count: 1 }, { witnesses: "Bob", owner: "Bob", count: 1 }] },
]);
