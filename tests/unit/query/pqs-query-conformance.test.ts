import { describe, expect, it } from "vitest";
import type { NormalizedAggregateQuery, NormalizedFindManyQuery, NormalizedGroupByQuery } from "../../../src/query/canonical/query-ast.js";
import { PqsQueryClient } from "../../../src/query/pqs/pqs-query-client.js";
import { PqsSchemaProfileV1, type PqsRelation } from "../../../src/query/pqs/pqs-schema-profile.js";
import { evaluatorCases } from "./query-conformance-fixture.js";

const physicalRelation: Readonly<Record<string, PqsRelation>> = {
    contracts: "__contracts", contractTypes: "__contract_tpe", events: "__events", exercises: "__exercises",
    exerciseTypes: "__exercise_tpe", packages: "__packages", transactions: "__transactions", watermark: "__watermark",
};

interface PrivatePqsClient {
    findContractsAsync(query: NormalizedFindManyQuery): Promise<readonly Record<string, unknown>[]>;
    groupContractsAsync(query: NormalizedGroupByQuery): Promise<unknown>;
    readPhysicalAsync(relation: PqsRelation, query: NormalizedFindManyQuery): Promise<readonly Record<string, unknown>[]>;
    aggregatePhysicalAsync(relation: PqsRelation, query: NormalizedAggregateQuery): Promise<unknown>;
    groupPhysicalAsync(relation: PqsRelation, query: NormalizedGroupByQuery): Promise<unknown>;
}

describe("PQS conformance harness", () => {
    it.each(evaluatorCases)("executes the $name canonical case through PQS with exact parameterized calls", async ({ query, expected }) => {
        const calls: { text: string; values: readonly unknown[] }[] = [];

        const rows = fakeRows(query, expected);

        const client = new PqsQueryClient({ query: async (text, values) => {
            calls.push({ text, values });

            return { rows };
        } }, new PqsSchemaProfileV1()) as unknown as PrivatePqsClient;

        const actual = query.kind === "findMany"
            ? query.relation === "contracts" ? await client.findContractsAsync(query) : await client.readPhysicalAsync(physicalRelation[query.relation]!, query)
            : query.kind === "aggregate"
                ? await client.aggregatePhysicalAsync(physicalRelation[query.relation]!, query)
                : query.relation === "contracts" ? await client.groupContractsAsync(query) : await client.groupPhysicalAsync(physicalRelation[query.relation]!, query);

        expect(actual).toEqual(expected);
        expect(calls).toHaveLength(1);
        expect(calls[0]?.text).toMatch(/^select\s/);
        expect(calls[0]?.text).not.toContain("undefined");
        expect(calls[0]?.values).toEqual(expectedValues(query));
        expect(calls).toMatchSnapshot();
    });
});

function fakeRows(query: NormalizedFindManyQuery | NormalizedAggregateQuery | NormalizedGroupByQuery, expected: unknown): readonly Record<string, unknown>[] {
    if (query.kind === "findMany") {
        return query.relation === "contracts"
        ? (expected as readonly Record<string, unknown>[]).map((row) => ({ contract_id: row.contractId, ...row }))
        : expected as readonly Record<string, unknown>[];
    } else if (query.kind === "groupBy") {
        return expected as readonly Record<string, unknown>[];
    }

    const value = expected as Record<string, unknown>;

    const row: Record<string, unknown> = {};

    if (value.count !== undefined) {
        row.count = value.count;
    }

    for (const operation of ["min", "max", "sum"] as const) {
        for (const [field, aggregate] of Object.entries(value[operation] as Record<string, unknown> ?? {})) {
            row[`${operation}_${field}`] = aggregate;
        }
    }

    return [row];
}

function expectedValues(query: NormalizedFindManyQuery | NormalizedAggregateQuery | NormalizedGroupByQuery): readonly unknown[] {
    const predicateValues = values(query.predicate);

    const json = query.kind === "findMany" ? (query.select?.json ?? []).flatMap((projection) => [projection.path]) : query.kind === "groupBy" ? query.by.filter((key) => key.kind === "json").map((key) => key.path) : [];

    const page = query.kind === "findMany" ? [query.take, query.skip === 0 ? undefined : query.skip].filter((value) => value !== undefined) : [];

    const includes = query.kind === "findMany" ? includeValues(query.includes) : [];

    return [...predicateValues, ...page, ...includes, ...json];
}

function includeValues(includes: readonly NormalizedFindManyQuery["includes"][number][]): unknown[] {
    return includes.flatMap((include) => [...values(include.predicate), include.take, include.skip === 0 ? undefined : include.skip].filter((value) => value !== undefined).concat(includeValues(include.includes)));
}

function values(predicate: NormalizedFindManyQuery["predicate"]): unknown[] {
    if (predicate === undefined) {
        return [];
    } else if (predicate.kind === "scalar") {
        return predicate.operator === "is" || predicate.operator === "isNot" ? [] : predicate.path.length > 1 ? [predicate.path.slice(1), predicate.value] : [predicate.value];
    } else if (predicate.kind === "not" || predicate.kind === "relation") {
        return values(predicate.kind === "not" ? predicate.child : predicate.predicate);
    }

    return predicate.children.flatMap(values);
}
