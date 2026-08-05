import {
    ContractCountArgs,
    ContractFindManyArgs,
    ContractFindUniqueArgs,
    ContractGroupByArgs,
    ContractGroupRow,
    ContractResult,
    JsonProjectionResult,
} from "../model-types.js";
import { ContractCacheArgs, ContractCacheInspection, ContractCacheResult, QueryClient } from "../query-client.js";
import { QuerySource } from "../query-source.js";
import { PqsQueryError } from "../errors/pqs-query-error.js";
import { compileContractAggregate, compileContractCount, compileContractFindMany, compileContractGroupBy } from "./pqs-sql-compiler.js";
import {
    compilePqsRelationAggregate,
    compilePqsRelationCount,
    compilePqsRelationFindMany,
    compilePqsRelationGroupBy,
    type PqsIncludedResultShape,
    type PqsRelationResultShape,
} from "./pqs-relational-sql-compiler.js";
import { normalizeAggregate, normalizeCount, normalizeFindMany, normalizeFindUnique, normalizeGroupBy } from "../canonical/query-normalizer.js";
import type { NormalizedAggregateQuery, NormalizedFindManyQuery, NormalizedFindUniqueQuery, NormalizedGroupByQuery } from "../canonical/query-ast.js";
import { PqsRelation, PqsRelationMetadata, PqsSchemaProfileV1, pqsRelationMetadata } from "./pqs-schema-profile.js";
import { assertReadOnlySql } from "./read-only-sql.js";

export interface PqsQueryExecutor {
    query(text: string, values: readonly unknown[]): Promise<{
        readonly rows: readonly Record<string, unknown>[];
    }>;
}

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

export class PqsQueryClient implements QueryClient {
    public readonly source = QuerySource.pqs;
    public readonly contracts = {
        findMany: async <TArgs extends ContractFindManyArgs>(args: TArgs = {} as TArgs) =>
            await this.findContractsAsync(normalizeFindMany("contracts", args)) as readonly (ContractResult & JsonProjectionResult<TArgs>)[],
        findUnique: async <TArgs extends ContractFindUniqueArgs>(args: TArgs) =>
            (await this.findContractsAsync(normalizedUniqueAsFindMany(normalizeFindUnique("contracts", args))))[0] as (ContractResult & JsonProjectionResult<TArgs>) | undefined,
        count: async (args: ContractCountArgs = {}) => this.countContractsAsync(normalizeCount("contracts", args)),
        aggregate: async (args: Parameters<QueryClient["contracts"]["aggregate"]>[0]) => this.aggregateContractsAsync(normalizeAggregate("contracts", args)),
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

    public async $queryRaw<TRow>(sql: string, values: readonly unknown[] = []): Promise<readonly TRow[]> {
        assertReadOnlySql(sql);
        try {
            await this.ready;
            return (await this.executor.query(sql, values)).rows as readonly TRow[];
        } catch (cause) {
            throw this.wrap("$queryRaw", cause);
        }
    }

    public async cacheContracts(_args?: ContractCacheArgs): Promise<ContractCacheResult> {
        return { source: QuerySource.pqs, cached: false };
    }

    public async invalidateContractsCache(_args?: ContractCacheArgs): Promise<void> {}

    public async inspectContractsCache(_args?: ContractCacheArgs): Promise<ContractCacheInspection | undefined> {
        return undefined;
    }

    private createPhysicalDelegate(relation: PqsRelation, hasUnique = true) {
        const queryRelation = queryRelationForPqs[relation];
        const delegate = {
            findMany: async (args: Readonly<Record<string, unknown>> = {}) =>
                this.readPhysicalAsync(relation, normalizeFindMany(queryRelation, args)),
            count: async (args: Readonly<Record<string, unknown>> = {}) =>
                this.countPhysicalAsync(relation, normalizeCount(queryRelation, args)),
            aggregate: async (args: Readonly<Record<string, unknown>>) =>
                this.aggregatePhysicalAsync(relation, normalizeAggregate(queryRelation, args)),
            groupBy: async (args: Readonly<Record<string, unknown>>) =>
                this.groupPhysicalAsync(relation, normalizeGroupBy(queryRelation, args)),
        };

        return hasUnique ? {
            ...delegate,
            findUnique: async (args: Readonly<Record<string, unknown>>) =>
                (await this.readPhysicalAsync(relation, normalizedUniqueAsFindMany(normalizeFindUnique(queryRelation, args))))[0],
        } : delegate;
    }

    private async readPhysicalAsync(relation: PqsRelation, query: NormalizedFindManyQuery): Promise<readonly Record<string, unknown>[]> {
        const compiled = compilePqsRelationFindMany(relation, query, this.profile);
        try {
            await this.ready;
            return (await this.executor.query(compiled.text, compiled.values)).rows.map((row) => this.mapPhysicalRow(row, compiled.resultShape));
        } catch (cause) {
            throw this.wrap(`${relation}.findMany`, cause);
        }
    }

    private async countPhysicalAsync(relation: PqsRelation, query: ReturnType<typeof normalizeCount>): Promise<number> {
        const compiled = compilePqsRelationCount(relation, query, this.profile);
        try {
            await this.ready;
            return Number((await this.executor.query(compiled.text, compiled.values)).rows[0]?.count ?? 0);
        } catch (cause) {
            throw this.wrap(`${relation}.count`, cause);
        }
    }

    private async aggregatePhysicalAsync(relation: PqsRelation, query: NormalizedAggregateQuery): Promise<{ readonly count?: number; readonly min?: Readonly<Record<string, string | null>>; readonly max?: Readonly<Record<string, string | null>>; readonly sum?: Readonly<Record<string, string | null>> }> {
        const compiled = compilePqsRelationAggregate(relation, query, this.profile);
        try {
            await this.ready;
            const row = (await this.executor.query(compiled.text, compiled.values)).rows[0] ?? {};
            const result: { count?: number; min?: Record<string, string | null>; max?: Record<string, string | null>; sum?: Record<string, string | null> } = {};
            if (query.aggregates.count) result.count = Number(row.count ?? 0);
            for (const [operation, fields] of [["min", query.aggregates.min], ["max", query.aggregates.max], ["sum", query.aggregates.sum]] as const) {
                if (fields.length > 0) result[operation] = Object.fromEntries(fields.map((field) => [field, nullableString(row[`${operation}_${field}`])]));
            }
            return result;
        } catch (cause) {
            throw this.wrap(`${relation}.aggregate`, cause);
        }
    }

    private async groupPhysicalAsync(relation: PqsRelation, query: NormalizedGroupByQuery): Promise<readonly Record<string, string | number | Date | null>[]> {
        const compiled = compilePqsRelationGroupBy(relation, query, this.profile);
        try {
            await this.ready;
            return (await this.executor.query(compiled.text, compiled.values)).rows.map((row) => Object.fromEntries(Object.entries(row).map(([name, value]) => [name, name === "count" ? Number(value) : value instanceof Date ? value : value === null ? null : String(value)])));
        } catch (cause) {
            throw this.wrap(`${relation}.groupBy`, cause);
        }
    }

    private mapPhysicalRow(row: Record<string, unknown>, shape: PqsRelationResultShape, scalarSource = row): Record<string, unknown> {
        const metadata = pqsRelationMetadata[shape.relation];
        const scalar = Object.fromEntries(shape.fields
            .filter(({ name }) => Object.hasOwn(scalarSource, name) || Object.hasOwn(scalarSource, metadata.fields[name] ?? ""))
            .map(({ name }) => [name, mapPhysicalValue(scalarSource[name] ?? scalarSource[metadata.fields[name] ?? ""], shape.relation, metadata, name)]));
        const projected = Object.fromEntries(shape.json.map((projection) => [projection.name, mapJsonValue(row[projection.name], projection.as)]));
        const included = Object.fromEntries(shape.includes.map((include) => [include.edge, this.mapIncludedPhysicalValue(row[include.edge], include)]));
        return { ...scalar, ...projected, ...included };
    }

    private mapIncludedPhysicalValue(value: unknown, include: PqsIncludedResultShape): unknown {
        if (include.cardinality === "many") {
            if (value === null || value === undefined) return [];
            if (!Array.isArray(value)) throw new Error(`Invalid included ${include.target} rows`);
            return value.map((entry) => this.mapIncludedPhysicalValue(entry, { ...include, cardinality: "one" }));
        }
        if (value === null || value === undefined) return null;
        if (typeof value !== "object" || Array.isArray(value)) throw new Error(`Invalid included ${include.target} row`);
        return this.mapPhysicalRow(value as Record<string, unknown>, include.shape);
    }

    private async findContractsAsync(query: NormalizedFindManyQuery): Promise<readonly ContractResult[]> {
        const compiled = compileContractFindMany(query, this.profile);
        try {
            await this.ready;
            return (await this.executor.query(compiled.text, compiled.values)).rows.map((row) => this.mapPhysicalRow(contractRootRow(row), compiled.resultShape, contractRootScalars(row)) as unknown as ContractResult);
        } catch (cause) {
            throw this.wrap("contracts.findMany", cause);
        }
    }

    private async countContractsAsync(query: ReturnType<typeof normalizeCount>): Promise<number> {
        const compiled = compileContractCount(query, this.profile);
        try {
            await this.ready;
            return Number((await this.executor.query(compiled.text, compiled.values)).rows[0]?.count ?? 0);
        } catch (cause) {
            throw this.wrap("contracts.count", cause);
        }
    }

    private async aggregateContractsAsync(normalized: NormalizedAggregateQuery): Promise<Awaited<ReturnType<QueryClient["contracts"]["aggregate"]>>> {
        const compiled = compileContractAggregate(normalized, this.profile);
        try {
            await this.ready;
            const row = (await this.executor.query(compiled.text, compiled.values)).rows[0] ?? {};
        const result: { count?: number; min?: Partial<Record<"createdEventOffset" | "archivedEventOffset", string | null>>; max?: Partial<Record<"createdEventOffset" | "archivedEventOffset", string | null>>; sum?: Partial<Record<"createdEventOffset" | "archivedEventOffset", string | null>> } = {};
        if (normalized.aggregates.count) result.count = Number(row.count ?? 0);
        for (const [operation, fields] of [["min", normalized.aggregates.min], ["max", normalized.aggregates.max], ["sum", normalized.aggregates.sum]] as const) {
            if (fields.length > 0) result[operation] = Object.fromEntries(fields.map((field) => [field, nullableString(row[`${operation}_${field}`])]));
        }
        return result;
        } catch (cause) {
            throw this.wrap("contracts.aggregate", cause);
        }
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

function mapPhysicalValue(value: unknown, relation: PqsRelation, metadata: PqsRelationMetadata, field: string): unknown {
    if (value === null || value === undefined) return value ?? null;
    if (relation === "__events" && field === "eventId" && typeof value === "object" && !Array.isArray(value)) {
        const event = value as Readonly<Record<string, unknown>>;
        if (event.offset !== undefined && event.node_id !== undefined) return `${String(event.offset)}:${String(event.node_id)}`;
    }
    if (relation === "__events" && field === "type") {
        if (value === "create") return "created";
        if (value === "exercise") return "exercised";
    }
    if (relation === "__transactions" && field === "workflowId" && value === "") return null;
    if (relation === "__transactions" && field === "traceContext" && typeof value === "object" && !Array.isArray(value)) {
        const trace = value as Readonly<Record<string, unknown>>;
        const traceparent = trace.traceparent ?? trace.trace_parent;
        const tracestate = trace.tracestate ?? trace.trace_state;
        return Object.fromEntries([
            ...(traceparent === undefined || traceparent === null || traceparent === "" ? [] : [["traceparent", String(traceparent)] as const]),
            ...(tracestate === undefined || tracestate === null || tracestate === "" ? [] : [["tracestate", String(tracestate)] as const]),
        ]);
    }
    if (metadata.numericFields.includes(field)) return String(value);
    if (metadata.dateFields.includes(field)) return value instanceof Date ? value : new Date(String(value));
    if (metadata.binaryFields.includes(field)) return value instanceof Uint8Array ? value : new Uint8Array(value as ArrayLike<number>);
    if (metadata.arrayFields.includes(field)) return Array.isArray(value) ? value.map(String) : [];
    return value;
}

function mapJsonValue(value: unknown, as: "text" | "numeric" | "boolean" | "timestamp"): string | boolean | Date | null {
    if (value === null || value === undefined) return null;
    if (as === "boolean") return value === true || value === "true";
    if (as === "timestamp") return value instanceof Date ? value : new Date(String(value));
    return String(value);
}
function contractRootScalars(row: Record<string, unknown>): Record<string, unknown> {
    const scalars: Record<string, unknown> = {
        contractId: row.contract_id,
        packageId: row.package_id,
        payload: row.payload,
        witnesses: row.witnesses,
        createdEventOffset: row.created_event_offset,
        createdAt: row.created_at,
        archivedEventOffset: row.archived_event_offset,
        archivedAt: row.archived_at,
        active: row.active,
    };
    if (row.template_package_id !== undefined && row.template_module_name !== undefined && row.template_entity_name !== undefined) {
        scalars.templateId = { packageId: row.template_package_id, moduleName: row.template_module_name, entityName: row.template_entity_name };
    }
    return scalars;
}

function contractRootRow(row: Record<string, unknown>): Record<string, unknown> {
    return {
        ...row,
        contractType: row.contractType ?? row.contract_type,
        createdTransaction: row.createdTransaction ?? row.created_transaction,
        archivedTransaction: row.archivedTransaction ?? row.archived_transaction,
    };
}

function nullableString(value: unknown): string | null { return value === null || value === undefined ? null : String(value); }
function getPqsCode(cause: unknown): string | undefined { return typeof cause === "object" && cause !== null && "code" in cause && typeof cause.code === "string" ? cause.code : undefined; }
