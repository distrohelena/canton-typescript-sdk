import {
    ContractCountArgs,
    ContractFindManyArgs,
    ContractFindUniqueArgs,
    ContractGroupByArgs,
    ContractGroupRow,
    ContractRow,
    ContractResult,
    JsonProjectionResult,
    ContractTypeRow,
    TransactionRow,
    ExerciseRow,
    ExerciseResult,
} from "../model-types.js";
import { QueryClient } from "../query-client.js";
import { QuerySource } from "../query-source.js";
import { PqsQueryError } from "../errors/pqs-query-error.js";
import { compileContractFindMany, compileContractGroupBy } from "./pqs-sql-compiler.js";
import { compilePqsRelationGroupBy } from "./pqs-relational-sql-compiler.js";
import { canonicalFindManyArgs, canonicalGroupByArgs, canonicalPredicateArgs } from "./pqs-sql-compiler.js";
import { normalizeAggregate, normalizeCount, normalizeFindMany, normalizeFindUnique, normalizeGroupBy } from "../canonical/query-normalizer.js";
import type { NormalizedFindManyQuery, NormalizedFindUniqueQuery, NormalizedGroupByQuery } from "../canonical/query-ast.js";
import {
    PqsRelation,
    PqsRelationMetadata,
    PqsSchemaProfileV1,
    pqsRelationEdges,
    pqsRelationMetadata,
} from "./pqs-schema-profile.js";
import { assertReadOnlySql } from "./read-only-sql.js";

export interface PqsQueryExecutor {
    query(text: string, values: readonly unknown[]): Promise<{
        readonly rows: readonly Record<string, unknown>[];
    }>;
}

type RuntimeFilter = {
    readonly path?: readonly string[];
    readonly equals?: unknown;
    readonly in?: readonly unknown[];
    readonly is?: null;
    readonly isNot?: null;
    readonly has?: string;
    readonly lt?: unknown;
    readonly lte?: unknown;
    readonly gt?: unknown;
    readonly gte?: unknown;
    readonly like?: string;
    readonly ilike?: string;
};

interface RuntimeWhere {
    readonly [key: string]: RuntimeFilter | readonly RuntimeWhere[] | RuntimeWhere;
}
type RuntimeFindManyArgs = {
    readonly where?: RuntimeWhere;
    readonly select?: RuntimeSelect;
    readonly orderBy?: readonly Readonly<Record<string, "asc" | "desc">>[];
    readonly take?: number;
    readonly skip?: number;
    readonly include?: RuntimeInclude;
};

type RuntimeSelect = Readonly<Record<string, boolean | unknown>> & {
    readonly json?: Readonly<Record<string, { readonly field: string; readonly path: readonly string[]; readonly as: "text" | "numeric" | "boolean" | "timestamp" }>>;
};

type RuntimeInclude = Readonly<Record<string, true | {
    readonly take?: number;
    readonly where?: RuntimeWhere;
    readonly select?: RuntimeSelect;
    readonly orderBy?: readonly Readonly<Record<string, "asc" | "desc">>[];
    readonly include?: RuntimeInclude;
}>>;

type RuntimeAggregateArgs = {
    readonly where?: RuntimeFindManyArgs["where"];
    readonly count?: true;
    readonly min?: readonly string[];
    readonly max?: readonly string[];
    readonly sum?: readonly string[];
};

const logicalContractFields: readonly string[] = [
    "contractId",
    "templateId",
    "packageId",
    "payload",
    "witnesses",
    "createdEventOffset",
    "createdAt",
    "archivedEventOffset",
    "archivedAt",
    "active",
];

const queryRelationForPqs: Readonly<Record<PqsRelation, "contracts" | "contractTypes" | "events" | "exercises" | "exerciseTypes" | "packages" | "transactions" | "watermark">> = {
    __contracts: "contracts", __contract_tpe: "contractTypes", __events: "events", __exercises: "exercises",
    __exercise_tpe: "exerciseTypes", __packages: "packages", __transactions: "transactions", __watermark: "watermark",
};

function normalizedUniqueAsFindMany(query: NormalizedFindUniqueQuery): NormalizedFindManyQuery {
    return {
        kind: "findMany", relation: query.relation, predicate: query.predicate,
        select: query.select, includes: query.includes,
        orderBy: query.relation === "contracts" ? [{ path: ["contractId"], direction: "asc" }] : [],
        skip: 0, take: 1, activeOnly: false,
    };
}

function normalizedCountAsFindMany(query: ReturnType<typeof normalizeCount>): NormalizedFindManyQuery {
    return {
        kind: "findMany", relation: query.relation, parties: query.parties, predicate: query.predicate,
        includes: [], orderBy: query.relation === "contracts" ? [{ path: ["contractId"], direction: "asc" }] : [],
        skip: 0, activeOnly: query.activeOnly,
    };
}

export class PqsQueryClient implements QueryClient {
    public readonly source = QuerySource.pqs;
    public readonly contracts = {
        findMany: <TArgs extends ContractFindManyArgs>(args: TArgs = {} as TArgs) => this.findContractsAsync(normalizeFindMany("contracts", args)) as Promise<readonly (ContractResult & JsonProjectionResult<TArgs>)[]>,
        findUnique: <TArgs extends ContractFindUniqueArgs>(args: TArgs) =>
            this.findContractsAsync(normalizedUniqueAsFindMany(normalizeFindUnique("contracts", args))).then((rows) => rows[0] as (ContractResult & JsonProjectionResult<TArgs>) | undefined),
        count: async (args: ContractCountArgs = {}) =>
            (await this.findContractsAsync(normalizedCountAsFindMany(normalizeCount("contracts", args)))).length,
        aggregate: async (args: Parameters<QueryClient["contracts"]["aggregate"]>[0]) => this.aggregateContractsAsync(args),
        groupBy: async (args: ContractGroupByArgs) => this.groupContractsAsync(normalizeGroupBy("contracts", args)),
    };
    public readonly contractTypes = this.createPhysicalDelegate("__contract_tpe") as unknown as QueryClient["contractTypes"];
    public readonly events = this.createPhysicalDelegate("__events") as unknown as QueryClient["events"];
    public readonly exercises = this.createPhysicalDelegate("__exercises", false) as unknown as QueryClient["exercises"];
    public readonly exerciseTypes = this.createPhysicalDelegate("__exercise_tpe") as unknown as QueryClient["exerciseTypes"];
    public readonly packages = this.createPhysicalDelegate("__packages") as unknown as QueryClient["packages"];
    public readonly transactions = this.createPhysicalDelegate("__transactions") as unknown as QueryClient["transactions"];
    public readonly watermark = this.createPhysicalDelegate("__watermark") as unknown as QueryClient["watermark"];

    public constructor(
        private readonly executor: PqsQueryExecutor,
        private readonly profile: PqsSchemaProfileV1,
        private readonly ready: Promise<void> = Promise.resolve(),
    ) {}

    public async $queryRaw<TRow>(
        sql: string,
        values: readonly unknown[] = [],
    ): Promise<readonly TRow[]> {
        assertReadOnlySql(sql);
        try {
            await this.ready;

            return (await this.executor.query(sql, values)).rows as readonly TRow[];
        } catch (cause) {
            throw this.wrap("$queryRaw", cause);
        }
    }

    private createPhysicalDelegate(relation: PqsRelation, hasUnique = true) {
        const metadata = pqsRelationMetadata[relation];

        const findMany = async (args: RuntimeFindManyArgs = {}) => {
            const normalized = normalizeFindMany(queryRelationForPqs[relation], args);
            return this.readPhysicalAsync(relation, metadata, canonicalFindManyArgs(normalized) as RuntimeFindManyArgs);
        };

        const delegate = {
            findMany,
            count: async (args: { readonly where?: RuntimeFindManyArgs["where"] } = {}) => {
                const normalized = normalizeCount(queryRelationForPqs[relation], args);
                const { where, values } = this.compileWhere(relation, metadata, normalized.predicate === undefined ? undefined : canonicalPredicateArgs(normalized.predicate) as RuntimeWhere);

                try {
                    await this.ready;

                    const result = await this.executor.query(
                        `select count(*)::text as count from ${this.profile.relation(relation)}${where}`,
                        values,
                    );

                    return Number(result.rows[0]?.count ?? 0);
                } catch (cause) {
                    throw this.wrap(`${relation}.count`, cause);
                }
            },
            aggregate: async (args: RuntimeAggregateArgs) => this.aggregatePhysicalAsync(relation, metadata, args),
            groupBy: async (args: { readonly by: readonly unknown[]; readonly where?: RuntimeWhere; readonly aggregate: { readonly count?: true; readonly min?: readonly string[]; readonly max?: readonly string[]; readonly sum?: readonly string[] } }) => this.groupPhysicalAsync(relation, normalizeGroupBy(queryRelationForPqs[relation], args)),
        };

        if (!hasUnique) {
            return delegate;
        }

        return {
            ...delegate,
            findUnique: async (args: { readonly where: Readonly<Record<string, unknown>>; readonly select?: RuntimeFindManyArgs["select"]; readonly include?: RuntimeInclude }) => {
                const normalized = normalizeFindUnique(queryRelationForPqs[relation], args);
                return this.readPhysicalAsync(relation, metadata, canonicalFindManyArgs(normalizedUniqueAsFindMany(normalized)) as RuntimeFindManyArgs).then((rows) => rows[0]);
            },
        };
    }

    private async groupPhysicalAsync(relation: PqsRelation, query: NormalizedGroupByQuery): Promise<readonly Record<string, string | number | Date | null>[]> {
        const root = relation === "__events" ? '"event"' : '"root"';
        const args = canonicalGroupByArgs(query) as { readonly where?: RuntimeWhere };
        const filter = this.compileWhere(relation, pqsRelationMetadata[relation], args.where, undefined, root);
        const compiled = compilePqsRelationGroupBy(relation, query, this.profile, filter.values.length);
        const text = filter.where.length === 0 ? compiled.text : compiled.text.replace(" group by ", `${filter.where} group by `);
        try {
            await this.ready;
            return (await this.executor.query(text, [...filter.values, ...compiled.values])).rows.map((row) => Object.fromEntries(Object.entries(row).map(([name, value]) => [name, name === "count" ? Number(value) : value instanceof Date ? value : value === null ? null : String(value)])));
        } catch (cause) {
            throw this.wrap(`${relation}.groupBy`, cause);
        }
    }

    private async readPhysicalAsync(
        relation: PqsRelation,
        metadata: PqsRelationMetadata,
        args: RuntimeFindManyArgs,
    ): Promise<readonly Record<string, unknown>[]> {
        this.assertPage(args);

        const selected = this.selectedFields(relation, metadata, args.select);

        const { where, values } = this.compileWhere(relation, metadata, args.where);

        const orderBy = this.compileOrderBy(relation, metadata, args.orderBy);

        const parameters = [...values];

        const add = (value: unknown) => {
            parameters.push(value);

            return `$${parameters.length}`;
        };

        const limit = args.take === undefined ? "" : ` limit ${add(args.take)}`;

        const offset = args.skip === undefined ? "" : ` offset ${add(args.skip)}`;

        const selection = selected.map(([field, column]) => `"${column}" as "${field}"`).join(", ");
        const includes = this.compileIncludes(relation, args.include, add);
        const json = this.compileJsonSelections(relation, args.select?.json, add);
        const fullSelection = [selection, ...json.selection, ...includes.selection].filter((value) => value.length > 0).join(", ");

        try {
            await this.ready;

            const result = await this.executor.query(
                `select ${fullSelection} from ${this.profile.relation(relation)}${where}${orderBy}${limit}${offset}`,
                parameters,
            );

            return result.rows.map((row) => this.mapPhysicalRow(row, metadata, selected, includes.values, json.fields));
        } catch (cause) {
            throw this.wrap(`${relation}.findMany`, cause);
        }
    }

    private async aggregatePhysicalAsync(
        relation: PqsRelation,
        metadata: PqsRelationMetadata,
        args: RuntimeAggregateArgs,
    ): Promise<{ readonly count?: number; readonly min?: Readonly<Record<string, string | null>>; readonly max?: Readonly<Record<string, string | null>>; readonly sum?: Readonly<Record<string, string | null>> }> {
        const normalized = normalizeAggregate(queryRelationForPqs[relation], args);
        const { where, values } = this.compileWhere(relation, metadata, normalized.predicate === undefined ? undefined : canonicalPredicateArgs(normalized.predicate) as RuntimeWhere);

        const selected: string[] = [];

        if (normalized.aggregates.count) {
            selected.push("count(*)::text as count");
        }

        for (const [operation, fields] of [["min", normalized.aggregates.min], ["max", normalized.aggregates.max], ["sum", normalized.aggregates.sum]] as const) {
            for (const field of fields ?? []) {
                this.assertNumericField(relation, metadata, field);
                selected.push(`${operation}("${metadata.fields[field]}")::text as "${operation}_${field}"`);
            }
        }

        if (selected.length === 0) {
            throw new Error("aggregate must request at least one result");
        }

        try {
            await this.ready;

            const row = (await this.executor.query(
                `select ${selected.join(", ")} from ${this.profile.relation(relation)}${where}`,
                values,
            )).rows[0] ?? {};

            const result: { count?: number; min?: Record<string, string | null>; max?: Record<string, string | null>; sum?: Record<string, string | null> } = {};

            if (args.count) {
                result.count = Number(row.count ?? 0);
            }

            for (const [operation, fields] of [["min", normalized.aggregates.min], ["max", normalized.aggregates.max], ["sum", normalized.aggregates.sum]] as const) {
                if (fields.length > 0) {
                    result[operation] = Object.fromEntries(fields.map((field) => [field, nullableString(row[`${operation}_${field}`])]));
                }
            }

            return result;
        } catch (cause) {
            throw this.wrap(`${relation}.aggregate`, cause);
        }
    }

    private compileWhere(relation: PqsRelation, metadata: PqsRelationMetadata, filters: RuntimeFindManyArgs["where"], externalAdd?: (value: unknown) => string, parentExpression = this.profile.relation(relation)): { readonly where: string; readonly values: readonly unknown[] } {
        const values: unknown[] = [];

        const add = externalAdd ?? ((value: unknown) => {
            values.push(value);
            return `$${values.length}`;
        });

        if (relation === "__contracts") {
            const where = this.compileLogicalContractWhere(filters, add, parentExpression);
            return { where: where === "true" ? "" : ` where ${where}`, values };
        }

        const compile = (expression: RuntimeFindManyArgs["where"]): string => {
        const conditions: string[] = [];
        for (const [field, filter] of Object.entries(expression ?? {})) {
            if (field === "and" || field === "or") { if (!Array.isArray(filter)) throw new Error(`${field} must be an array`); conditions.push(filter.length ? `(${filter.map((child) => compile(child)).join(` ${field} `)})` : field === "and" ? "true" : "false"); continue; }
            if (field === "not") { if (filter === null || Array.isArray(filter) || typeof filter !== "object") throw new Error("not must be an expression"); conditions.push(`not (${compile(filter as RuntimeFindManyArgs["where"])})`); continue; }
            const edge = pqsRelationEdges[relation]?.[field];
            if (edge !== undefined) {
                if (filter === null || Array.isArray(filter) || typeof filter !== "object") throw new Error(`${field} must be a relation filter`);
                const related = filter as Readonly<Record<string, RuntimeWhere>>;
                const alias = `"${field}"`;
                const relatedCondition = (child: RuntimeWhere | undefined) => {
                    const where = this.compileWhere(edge.target, pqsRelationMetadata[edge.target], child, add, alias).where;
                    return where.length === 0 ? "true" : where.slice(" where ".length);
                };
                const join = `${alias}."${edge.targetColumn}" = ${parentExpression}."${edge.sourceColumn}"`;
                if (edge.cardinality === "one") {
                    if (Object.keys(related).some((name) => ["some", "none", "every"].includes(name))) throw new Error(`${field} is a to-one relation`);
                    conditions.push(`exists (select 1 from ${this.profile.relation(edge.target)} ${alias} where ${join} and (${relatedCondition(related)}))`);
                } else {
                    const operators = ["some", "none", "every"].filter((name) => related[name] !== undefined);
                    if (operators.length !== 1) throw new Error(`${field} requires exactly one of some, none, or every`);
                    const operator = operators[0];
                    const predicate = related[operator];
                    const condition = relatedCondition(predicate);
                    const subquery = `select 1 from ${this.profile.relation(edge.target)} ${alias} where ${join} and (${condition})`;
                    if (operator === "some") conditions.push(`exists (${subquery})`);
                    else if (operator === "none") conditions.push(`not exists (${subquery})`);
                    else conditions.push(`not exists (select 1 from ${this.profile.relation(edge.target)} ${alias} where ${join} and not (${condition}))`);
                }
                continue;
            }
            const column = this.field(relation, metadata, field);
            if (filter === null || Array.isArray(filter) || typeof filter !== "object") throw new Error(`${field} must be a filter`);
            const scalar = filter as RuntimeFilter;

            if (PqsSchemaProfileV1.jsonField(relation, field) && scalar.path !== undefined) {
                if (scalar.path.length === 0 || scalar.path.some((segment) => segment.length === 0)) throw new Error(`${field}.path must be a non-empty JSON path`);
                const expression = `"${column}" #>> ${add(scalar.path)}::text[]`;
                if (scalar.is === null) conditions.push(`${expression} is null`);
                if (scalar.isNot === null) conditions.push(`${expression} is not null`);
                if (scalar.equals !== undefined) conditions.push(`${expression} = ${add(scalar.equals)}`);
                if (scalar.in !== undefined) conditions.push(scalar.in.length === 0 ? "false" : `${expression} = any(${add(scalar.in)})`);
                for (const [operator, value] of [["lt", scalar.lt], ["lte", scalar.lte], ["gt", scalar.gt], ["gte", scalar.gte], ["like", scalar.like], ["ilike", scalar.ilike]] as const) {
                    if (value !== undefined) conditions.push(`${expression} ${operator === "lte" ? "<=" : operator === "gte" ? ">=" : operator} ${add(value)}`);
                }
                continue;
            }

            if (scalar.is === null) {
                conditions.push(`"${column}" is null`);
            }

            if (scalar.isNot === null) {
                conditions.push(`"${column}" is not null`);
            }

            if (scalar.equals !== undefined) {
                conditions.push(`"${column}" = ${add(scalar.equals)}`);
            }

            if (scalar.in !== undefined) {
                conditions.push(scalar.in.length === 0 ? "false" : `"${column}" = any(${add(scalar.in)})`);
            }

            if (scalar.has !== undefined) {
                if (!metadata.arrayFields.includes(field)) {
                    throw new Error(`${field} is not an array field of ${relation}`);
                }

                conditions.push(`${add(scalar.has)} = any("${column}")`);
            }
            for (const [operator, value] of [["lt", scalar.lt], ["lte", scalar.lte], ["gt", scalar.gt], ["gte", scalar.gte], ["like", scalar.like], ["ilike", scalar.ilike]] as const) {
                if (value === undefined) continue;
                if ((operator === "like" || operator === "ilike") && !metadata.stringFields?.includes(field)) throw new Error(`${field} does not support ${operator}`);
                if ((operator !== "like" && operator !== "ilike") && !metadata.numericFields.includes(field) && !metadata.dateFields.includes(field) && !metadata.stringFields?.includes(field)) throw new Error(`${field} does not support ${operator}`);
                conditions.push(`"${column}" ${operator === "lte" ? "<=" : operator === "gte" ? ">=" : operator} ${add(value)}`);
            }
        }
        return conditions.length ? conditions.join(" and ") : "true";
        };

        const where = compile(filters);
        return { where: where === "true" ? "" : ` where ${where}`, values };
    }

    private compileLogicalContractWhere(filters: RuntimeFindManyArgs["where"], add: (value: unknown) => string, alias: string): string {
        const compile = (expression: RuntimeFindManyArgs["where"]): string => {
            const conditions: string[] = [];
            for (const [field, filter] of Object.entries(expression ?? {})) {
                if (field === "and" || field === "or") { if (!Array.isArray(filter)) throw new Error(`${field} must be an array`); conditions.push(filter.length === 0 ? field === "and" ? "true" : "false" : `(${filter.map((child) => compile(child)).join(` ${field} `)})`); continue; }
                if (field === "not") { conditions.push(`not (${compile(filter as RuntimeWhere)})`); continue; }
                if (field === "active") { const value = typeof filter === "boolean" ? filter : (filter as RuntimeFilter).equals; if (typeof value !== "boolean") throw new Error("active supports only equals"); conditions.push(`${alias}."archived_at_ix" is ${value ? "null" : "not null"}`); continue; }
                if (field === "witnesses") { const value = (filter as RuntimeFilter).has; if (typeof value !== "string") throw new Error("witnesses supports only has"); conditions.push(`${add(value)} = any(${alias}."witnesses")`); continue; }
                if (field === "payload") { const match = (filter as { readonly match?: unknown }).match; if (match === undefined || typeof match !== "object" || match === null) throw new Error("payload requires match"); for (const [key, value] of Object.entries(match as Record<string, RuntimeFilter>)) if (value.equals !== undefined) conditions.push(`${alias}."payload" #>> ${add([key])}::text[] = ${add(value.equals)}`); continue; }
                const columns: Readonly<Record<string, string>> = { contractId: "contract_id", packageId: "creation_package_id", createdEventOffset: "created_at_ix", archivedEventOffset: "archived_at_ix" };
                const column = columns[field];
                if (column === undefined || filter === null || typeof filter !== "object") throw new Error(`${field} is not a supported contract filter`);
                const value = filter as RuntimeFilter;
                if (value.equals !== undefined) conditions.push(`${alias}."${column}" = ${add(value.equals)}`);
                else if (value.in !== undefined) conditions.push(value.in.length === 0 ? "false" : `${alias}."${column}" = any(${add(value.in)})`);
                else throw new Error(`${field} requires equals or in`);
            }
            return conditions.length === 0 ? "true" : conditions.join(" and ");
        };
        return compile(filters);
    }

    private selectedFields(relation: PqsRelation, metadata: PqsRelationMetadata, select: RuntimeFindManyArgs["select"]): readonly (readonly [string, string])[] {
        if (select === undefined) {
            return Object.entries(metadata.fields);
        }

        const selected = Object.entries(select).filter(([field, enabled]) => field !== "json" && enabled === true).map(([field]) => [field, this.field(relation, metadata, field)] as const);

        if (selected.length === 0 && Object.keys(select.json ?? {}).length === 0) {
            throw new Error("select must include at least one field");
        }

        return selected;
    }

    private compileOrderBy(relation: PqsRelation, metadata: PqsRelationMetadata, orderBy: RuntimeFindManyArgs["orderBy"]): string {
        if (orderBy === undefined) {
            return "";
        }

        const entries = orderBy.flatMap((entry) => Object.entries(entry));

        if (entries.length === 0 || entries.some(([, direction]) => direction !== "asc" && direction !== "desc")) {
            throw new Error("orderBy must be a non-empty list of one-field entries");
        }

        return ` order by ${entries.map(([field, direction]) => `"${this.field(relation, metadata, field)}" ${direction}`).join(", ")}`;
    }

    private assertUniqueWhere(relation: PqsRelation, metadata: PqsRelationMetadata, where: Readonly<Record<string, unknown>>): void {
        const fields = Object.keys(where).sort();

        const matches = metadata.uniqueKeys.some((key) => [...key].sort().join("\0") === fields.join("\0"));

        if (!matches) {
            throw new Error(`where is not a stable unique key of ${relation}`);
        }
    }

    private assertNumericField(relation: PqsRelation, metadata: PqsRelationMetadata, field: string): void {
        if (!metadata.numericFields.includes(field)) {
            throw new Error(`${field} is not a numeric aggregate field of ${relation}`);
        }
    }

    private field(relation: PqsRelation, metadata: PqsRelationMetadata, field: string): string {
        const column = metadata.fields[field];

        if (column === undefined) {
            throw new Error(`${field} is not a field of ${relation}`);
        }

        return column;
    }

    private assertPage(args: RuntimeFindManyArgs): void {
        for (const [name, value] of [["take", args.take], ["skip", args.skip]] as const) {
            if (value !== undefined && (!Number.isInteger(value) || value < 0)) {
                throw new Error(`${name} must be a non-negative integer`);
            }
        }
    }

    private mapPhysicalRow(row: Record<string, unknown>, metadata: PqsRelationMetadata, fields: readonly (readonly [string, string])[], includes: Readonly<Record<string, { readonly target: PqsRelation; readonly options: Exclude<RuntimeInclude[string], true> }>>, json: Readonly<Record<string, "text" | "numeric" | "boolean" | "timestamp">> = {}): Record<string, unknown> {
        const scalar = Object.fromEntries(fields
            .filter(([field]) => Object.hasOwn(row, field))
            .map(([field]) => [field, mapPhysicalValue(row[field], metadata, field)]));
        const related = Object.fromEntries(Object.entries(includes).map(([name, edge]) => [name, this.mapRelatedValue(row[name], edge.target, edge.options)]));
        const projected = Object.fromEntries(Object.entries(json).map(([name, as]) => [name, mapJsonValue(row[name], as)]));
        return { ...scalar, ...projected, ...related };
    }

    private mapRelatedValue(value: unknown, relation: PqsRelation, options: Exclude<RuntimeInclude[string], true>): unknown {
        if (value === null || value === undefined) return value ?? null;
        if (Array.isArray(value)) return value.map((entry) => this.mapRelatedValue(entry, relation, options));
        if (typeof value !== "object") throw new Error(`Invalid included ${relation} row`);
        if (relation === "__contracts") return this.mapLogicalContractValue(value as Record<string, unknown>, options);
        const metadata = pqsRelationMetadata[relation];
        const row = value as Record<string, unknown>;
        const fields = this.selectedFields(relation, metadata, options.select);
        const nested = Object.fromEntries(Object.entries(options.include ?? {}).map(([name, option]) => {
            const edge = pqsRelationEdges[relation]?.[name];
            if (edge === undefined) throw new Error(`${name} is not a relation of ${relation}`);
            return [name, { target: edge.target, options: option === true ? {} : option }];
        }));
        const json = Object.fromEntries(Object.entries(options.select?.json ?? {}).map(([name, projection]) => [name, projection.as]));
        const normalized = Object.fromEntries(fields
            .filter(([field, column]) => Object.hasOwn(row, field) || Object.hasOwn(row, column))
            .map(([field, column]) => [field, row[field] ?? row[column]]));
        for (const name of Object.keys(nested)) normalized[name] = row[name];
        for (const name of Object.keys(json)) normalized[name] = row[name];
        return this.mapPhysicalRow(normalized, metadata, fields, nested, json);
    }

    private mapLogicalContractValue(row: Record<string, unknown>, options: Exclude<RuntimeInclude[string], true>): Record<string, unknown> {
        const fields = options.select === undefined
            ? logicalContractFields
            : Object.entries(options.select).filter(([field, enabled]) => field !== "json" && enabled === true).map(([field]) => {
                if (!logicalContractFields.includes(field)) throw new Error(`${field} is not a field of __contracts`);
                return field;
            });
        const scalar = Object.fromEntries(fields.filter((field) => Object.hasOwn(row, field)).map((field) => [field, row[field]]));
        const relations = Object.fromEntries(Object.entries(options.include ?? {}).map(([name, option]) => {
            const edge = pqsRelationEdges.__contracts?.[name];
            if (edge === undefined) throw new Error(`${name} is not a relation of __contracts`);
            return [name, this.mapRelatedValue(row[name], edge.target, option === true ? {} : option)];
        }));
        const json = Object.fromEntries(Object.entries(options.select?.json ?? {}).map(([name, projection]) => [name, mapJsonValue(row[name], projection.as)]));
        return { ...scalar, ...json, ...relations };
    }

    private compileIncludes(relation: PqsRelation, include: RuntimeInclude | undefined, add: (value: unknown) => string, parentExpression = this.profile.relation(relation)): { readonly selection: readonly string[]; readonly values: Readonly<Record<string, { readonly target: PqsRelation; readonly options: Exclude<RuntimeInclude[string], true> }>>; } {
        const selections: string[] = [];
        const values: Record<string, { target: PqsRelation; options: Exclude<RuntimeInclude[string], true> }> = {};
        for (const [name, option] of Object.entries(include ?? {})) {
            const edge = pqsRelationEdges[relation]?.[name];
            if (edge === undefined) throw new Error(`${name} is not a relation of ${relation}`);
            const options = option === true ? {} : option;
            if (edge.cardinality === "many" && options.take === undefined) throw new Error(`${name} is a to-many relation and requires take`);
            if (options.take !== undefined && (!Number.isInteger(options.take) || options.take < 0)) throw new Error(`${name}.take must be a non-negative integer`);
            const expression = this.compileIncludedExpression(name, edge.target, edge.sourceColumn, edge.targetColumn, edge.cardinality, options, add, parentExpression);
            selections.push(`${expression} as "${name}"`);
            values[name] = { target: edge.target, options };
        }
        return { selection: selections, values };
    }

    private compileJsonSelections(relation: PqsRelation, selections: RuntimeSelect["json"] | undefined, add: (value: unknown) => string, tableAlias?: string): { readonly selection: readonly string[]; readonly fields: Readonly<Record<string, "text" | "numeric" | "boolean" | "timestamp">> } {
        const selection: string[] = [];
        const fields: Record<string, "text" | "numeric" | "boolean" | "timestamp"> = {};
        for (const [name, projection] of Object.entries(selections ?? {})) {
            if (!PqsSchemaProfileV1.jsonField(relation, projection.field)) throw new Error(`${projection.field} is not a JSON field of ${relation}`);
            if (projection.path.length === 0 || projection.path.some((segment) => segment.length === 0)) throw new Error(`${name}.path must be a non-empty JSON path`);
            const column = this.field(relation, pqsRelationMetadata[relation], projection.field);
            const text = `${tableAlias === undefined ? "" : `${tableAlias}.`}"${column}" #>> ${add(projection.path)}::text[]`;
            const expression = projection.as === "text" ? text : projection.as === "numeric" ? `(${text})::numeric::text` : projection.as === "boolean" ? `(${text})::boolean` : `(${text})::timestamptz`;
            selection.push(`${expression} as "${name}"`);
            fields[name] = projection.as;
        }
        return { selection, fields };
    }

    private compileIncludedExpression(name: string, target: PqsRelation, sourceColumn: string, targetColumn: string, cardinality: "one" | "many", options: Exclude<RuntimeInclude[string], true>, add: (value: unknown) => string, parentExpression: string): string {
        const alias = `"${name}"`;
        const targetMetadata = pqsRelationMetadata[target];
        const fields = target === "__contracts" ? [] : this.selectedFields(target, targetMetadata, options.select);
        const json = target === "__contracts"
            ? this.compileLogicalContractJsonSelections(options.select?.json, add, alias)
            : this.compileJsonSelections(target, options.select?.json, add, alias).selection;
        const nested = this.compileIncludes(target, options.include, add, alias).selection;
        const scalarSelections = target === "__contracts"
            ? this.compileLogicalContractSelections(alias, options.select)
            : fields.map(([field, column]) => `'${field}', ${alias}."${column}"`);
        const object = `jsonb_build_object(${[...scalarSelections, ...[...json, ...nested].flatMap((selection) => {
            const match = /^(.*) as "([^"]+)"$/.exec(selection);
            return match === null ? [] : [`'${match[2]}', ${match[1]}`];
        })].join(", ")})`;
        const { where } = this.compileWhere(target, targetMetadata, options.where, add, alias);
        const condition = `${alias}."${targetColumn}" = ${parentExpression}."${sourceColumn}"`;
        const childWhere = where.length === 0 ? ` where ${condition}` : `${where} and ${condition}`;
        if (cardinality === "one") return `(select ${object} from ${this.profile.relation(target)} ${alias}${childWhere})`;
        const orderBy = this.compileOrderBy(target, targetMetadata, options.orderBy);
        return `(select coalesce(jsonb_agg("${name}_limited".value), '[]'::jsonb) from (select ${object} as value from ${this.profile.relation(target)} ${alias}${childWhere}${orderBy} limit ${add(options.take!)}) "${name}_limited")`;
    }

    private compileLogicalContractSelections(alias: string, select: RuntimeSelect | undefined): readonly string[] {
        const selected = select === undefined
            ? logicalContractFields
            : Object.entries(select).filter(([field, enabled]) => field !== "json" && enabled === true).map(([field]) => field);
        if (selected.length === 0 && Object.keys(select?.json ?? {}).length === 0) throw new Error("select must include at least one field");
        const expressions: Readonly<Record<string, string>> = {
            contractId: `${alias}."contract_id"`,
            templateId: `jsonb_build_object('packageId', ${alias}."creation_package_id", 'moduleName', (select contract_type."module_name" from ${this.profile.relation("__contract_tpe")} contract_type where contract_type."pk" = ${alias}."tpe_pk"), 'entityName', (select contract_type."entity_name" from ${this.profile.relation("__contract_tpe")} contract_type where contract_type."pk" = ${alias}."tpe_pk"))`,
            packageId: `${alias}."creation_package_id"`,
            payload: `${alias}."payload"`,
            witnesses: `${alias}."witnesses"`,
            createdEventOffset: `${alias}."created_at_ix"::text`,
            createdAt: `(select created_transaction."effective_at" from ${this.profile.relation("__transactions")} created_transaction where created_transaction."ix" = ${alias}."created_at_ix")`,
            archivedEventOffset: `${alias}."archived_at_ix"::text`,
            archivedAt: `(select archived_transaction."effective_at" from ${this.profile.relation("__transactions")} archived_transaction where archived_transaction."ix" = ${alias}."archived_at_ix")`,
            active: `${alias}."archived_at_ix" is null`,
        };
        return selected.map((field) => {
            const expression = expressions[field];
            if (expression === undefined) throw new Error(`${field} is not a field of __contracts`);
            return `'${field}', ${expression}`;
        });
    }

    private compileLogicalContractJsonSelections(selections: RuntimeSelect["json"] | undefined, add: (value: unknown) => string, alias: string): readonly string[] {
        return Object.entries(selections ?? {}).map(([name, projection]) => {
            if (projection.field !== "payload") throw new Error(`${projection.field} is not a JSON field of __contracts`);
            if (projection.path.length === 0 || projection.path.some((segment) => segment.length === 0)) throw new Error(`${name}.path must be a non-empty JSON path`);
            const text = `${alias}."payload" #>> ${add(projection.path)}::text[]`;
            const expression = projection.as === "text" ? text : projection.as === "numeric" ? `(${text})::numeric::text` : projection.as === "boolean" ? `(${text})::boolean` : `(${text})::timestamptz`;
            return `${expression} as "${name}"`;
        });
    }

    private async findContractsAsync(query: NormalizedFindManyQuery): Promise<readonly ContractResult[]> {
        const compiled = compileContractFindMany(query, this.profile);

        try {
            const args = canonicalFindManyArgs(query) as { readonly include?: RuntimeInclude; readonly select?: RuntimeSelect };
            const rows = (await this.executor.query(compiled.text, compiled.values)).rows.map((row) => mapContractRow(row, args.include, args.select?.json));

            const select = args.select;

            if (select === undefined) {
                return rows;
            }

            const fields = Object.entries(select).filter(([field, enabled]) => field !== "json" && enabled === true).map(([field]) => field);
            const json = Object.keys(select.json ?? {});

            if (fields.length === 0 && json.length === 0) {
                throw new Error("select must include at least one field");
            }

            return rows.map((row) => Object.fromEntries([
                ...fields.map((field) => [field, row[field as keyof ContractRow]]),
                ...json.map((field) => [field, row[field as keyof ContractResult]]),
            ]) as ContractResult);
        } catch (cause) {
            throw this.wrap("contracts.findMany", cause);
        }
    }

    private async aggregateContractsAsync(args: Parameters<QueryClient["contracts"]["aggregate"]>[0]): Promise<Awaited<ReturnType<QueryClient["contracts"]["aggregate"]>>> {
        const normalized = normalizeAggregate("contracts", args);
        const rows = await this.findContractsAsync({ kind: "findMany", relation: "contracts", predicate: normalized.predicate, includes: [], orderBy: [{ path: ["contractId"], direction: "asc" }], skip: 0, activeOnly: false });

        const result: {
            count?: number;
            min?: Partial<Record<"createdEventOffset" | "archivedEventOffset", string | null>>;
            max?: Partial<Record<"createdEventOffset" | "archivedEventOffset", string | null>>;
            sum?: Partial<Record<"createdEventOffset" | "archivedEventOffset", string | null>>;
        } = {};

        if (normalized.aggregates.count) {
            result.count = rows.length;
        }

        for (const [operation, fields] of [["min", normalized.aggregates.min], ["max", normalized.aggregates.max], ["sum", normalized.aggregates.sum]] as const) {
            if (fields.length > 0) {
                result[operation] = Object.fromEntries(fields.map((field) => [field, aggregateNumeric(rows.map((row) => (row as unknown as Record<string, string | null>)[field]), operation)]));
            }
        }

        return result;
    }

    private async groupContractsAsync(query: NormalizedGroupByQuery): Promise<readonly ContractGroupRow[]> {
        const compiled = compileContractGroupBy(query, this.profile);
        try {
            await this.ready;
            return (await this.executor.query(compiled.text, compiled.values)).rows.map((row) => Object.fromEntries(Object.entries(row).map(([name, value]) => [name, name === "count" ? Number(value) : value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value instanceof Date ? value : String(value)])));
        } catch (cause) {
            throw this.wrap("contracts.groupBy", cause);
        }
    }

    private wrap(operation: string, cause: unknown): PqsQueryError {
        return new PqsQueryError({ operation, code: getPqsCode(cause), cause });
    }
}

function mapPhysicalValue(value: unknown, metadata: PqsRelationMetadata, field: string): unknown {
    if (value === null || value === undefined) {
        return value ?? null;
    } else if (metadata.numericFields.includes(field)) {
        return String(value);
    } else if (metadata.dateFields.includes(field)) {
        return value instanceof Date ? value : new Date(String(value));
    } else if (metadata.binaryFields.includes(field)) {
        return value instanceof Uint8Array ? value : new Uint8Array(value as ArrayLike<number>);
    } else if (metadata.arrayFields.includes(field)) {
        return Array.isArray(value) ? value.map(String) : [];
    }

    return value;
}

function mapJsonValue(value: unknown, as: "text" | "numeric" | "boolean" | "timestamp"): string | boolean | Date | null {
    if (value === null || value === undefined) return null;
    if (as === "boolean") return value === true || value === "true";
    if (as === "timestamp") return value instanceof Date ? value : new Date(String(value));
    return String(value);
}

function mapProfileJsonRow(value: unknown, relation: PqsRelation): Record<string, unknown> | null {
    if (value === null || value === undefined) return null;
    if (typeof value !== "object" || Array.isArray(value)) throw new Error(`Invalid included ${relation} row`);
    const row = value as Record<string, unknown>;
    const metadata = pqsRelationMetadata[relation];
    return Object.fromEntries(Object.entries(metadata.fields).map(([field, column]) => [field, mapPhysicalValue(row[field] ?? row[column], metadata, field)]));
}

function mapSelectedProfileJsonRow(value: unknown, relation: PqsRelation): Record<string, unknown> | null {
    if (value === null || value === undefined) return null;
    if (typeof value !== "object" || Array.isArray(value)) throw new Error(`Invalid included ${relation} row`);
    const row = value as Record<string, unknown>;
    const metadata = pqsRelationMetadata[relation];
    return Object.fromEntries(Object.entries(metadata.fields)
        .filter(([field, column]) => Object.hasOwn(row, field) || Object.hasOwn(row, column))
        .map(([field, column]) => [field, mapPhysicalValue(row[field] ?? row[column], metadata, field)]));
}

function mapContractTypeJson(value: unknown): ContractTypeRow | undefined {
    const row = mapProfileJsonRow(value, "__contract_tpe");
    return row === null ? undefined : { pk: String(row.pk), payloadType: String(row.payloadType), aliases: stringArray(row.aliases), packageName: String(row.packageName), moduleName: String(row.moduleName), entityName: String(row.entityName), templateFqn: String(row.templateFqn) };
}

function mapTransactionJson(value: unknown): TransactionRow | undefined {
    const row = mapProfileJsonRow(value, "__transactions");
    return row === null ? undefined : { ix: String(row.ix), offset: String(row.offset), transactionId: nullableString(row.transactionId), effectiveAt: nullableDate(row.effectiveAt), workflowId: nullableString(row.workflowId), domainId: nullableString(row.domainId), traceContext: row.traceContext, externalTransactionHash: row.externalTransactionHash instanceof Uint8Array ? row.externalTransactionHash : null, paidTrafficCost: nullableString(row.paidTrafficCost) };
}

function mapEventJson(value: unknown): Record<string, unknown> | undefined {
    const row = mapSelectedProfileJsonRow(value, "__events");
    return row ?? undefined;
}

function mapSelectedRelationJson(value: unknown, relation: PqsRelation): Record<string, unknown> | undefined {
    const row = mapSelectedProfileJsonRow(value, relation);
    return row ?? undefined;
}

function mapLogicalContractJson(value: unknown): ContractResult | undefined {
    if (value === null || value === undefined) return undefined;
    if (typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid included __contracts row");
    return value as ContractResult;
}

function mapExerciseJson(value: unknown): ExerciseResult {
    const raw = value as Record<string, unknown>;
    const row = mapSelectedProfileJsonRow(value, "__exercises");
    if (row === null) throw new Error("Included exercise cannot be null");
    const base = row;
    const knownFields = new Set(Object.entries(pqsRelationMetadata.__exercises.fields).flatMap(([field, column]) => [field, column]));
    const knownRelations = new Set(Object.keys(pqsRelationEdges.__exercises ?? {}));
    const projections = Object.fromEntries(Object.entries(raw).filter(([name]) => !knownFields.has(name) && !knownRelations.has(name)));
    return {
        ...base,
        ...projections,
        ...(raw.exerciseType === undefined ? {} : { exerciseType: mapSelectedRelationJson(raw.exerciseType, "__exercise_tpe") }),
        ...(raw.contractType === undefined ? {} : { contractType: mapSelectedRelationJson(raw.contractType, "__contract_tpe") }),
        ...(raw.event === undefined ? {} : { event: raw.event === null ? null : mapEventJson(raw.event) ?? null }),
        ...(raw.transaction === undefined ? {} : { transaction: raw.transaction === null ? null : mapTransactionJson(raw.transaction) ?? null }),
        ...(raw.package === undefined ? {} : { package: mapSelectedRelationJson(raw.package, "__packages") }),
        ...(raw.contract === undefined ? {} : { contract: mapLogicalContractJson(raw.contract) }),
    } as ExerciseResult;
}

function mapContractRow(row: Record<string, unknown>, include: ContractFindManyArgs["include"] | undefined, json: Readonly<Record<string, { readonly as: "text" | "numeric" | "boolean" | "timestamp" }>> | undefined): ContractResult {
    const base: ContractRow = { contractId: String(row.contract_id), templateId: { packageId: String(row.template_package_id), moduleName: String(row.template_module_name), entityName: String(row.template_entity_name) }, packageId: nullableString(row.package_id), payload: row.payload, witnesses: stringArray(row.witnesses), createdEventOffset: String(row.created_event_offset), createdAt: nullableDate(row.created_at), archivedEventOffset: nullableString(row.archived_event_offset), archivedAt: nullableDate(row.archived_at), active: row.active === true };
    const relations = {
        ...(include?.contractType === undefined ? {} : { contractType: mapContractTypeJson(row.contractType ?? row.contract_type) }),
        ...(include?.createdTransaction === undefined ? {} : { createdTransaction: mapTransactionJson(row.createdTransaction ?? row.created_transaction) }),
        ...(include?.archivedTransaction === undefined ? {} : { archivedTransaction: (row.archivedTransaction ?? row.archived_transaction) === null || (row.archivedTransaction ?? row.archived_transaction) === undefined ? null : mapTransactionJson(row.archivedTransaction ?? row.archived_transaction) ?? null }),
        ...(include?.exercises === undefined ? {} : { exercises: Array.isArray(row.exercises) ? row.exercises.map(mapExerciseJson) : [] }),
    };
    const projections = Object.fromEntries(Object.entries(json ?? {}).map(([name, projection]) => [name, mapJsonValue(row[name], projection.as)]));
    return { ...base, ...relations, ...projections };
}

function nullableString(value: unknown): string | null {
    return value === null || value === undefined ? null : String(value);
}
function nullableDate(value: unknown): Date | null {
    return value === null || value === undefined ? null : value instanceof Date ? value : new Date(String(value));
}
function stringArray(value: unknown): readonly string[] {
    return Array.isArray(value) ? value.map(String) : [];
}
function getPqsCode(cause: unknown): string | undefined {
    return typeof cause === "object" && cause !== null && "code" in cause && typeof cause.code === "string" ? cause.code : undefined;
}

function aggregateNumeric(values: readonly (string | null)[], operation: "min" | "max" | "sum"): string | null {
    const numbers = values.filter((value): value is string => value !== null).map(BigInt);

    if (numbers.length === 0) {
        return null;
    } else if (operation === "sum") {
        return numbers.reduce((total, value) => total + value, 0n).toString();
    }

    return numbers.reduce((result, value) => operation === "min" ? value < result ? value : result : value > result ? value : result).toString();
}
