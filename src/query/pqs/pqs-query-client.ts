import {
    ContractCountArgs,
    ContractFindManyArgs,
    ContractFindUniqueArgs,
    ContractRow,
} from "../model-types.js";
import { QueryClient } from "../query-client.js";
import { QuerySource } from "../query-source.js";
import { PqsQueryError } from "../errors/pqs-query-error.js";
import { compileContractFindMany } from "./pqs-sql-compiler.js";
import {
    PqsRelation,
    PqsRelationMetadata,
    PqsSchemaProfileV1,
    pqsRelationMetadata,
} from "./pqs-schema-profile.js";
import { assertReadOnlySql } from "./read-only-sql.js";

export interface PqsQueryExecutor {
    query(text: string, values: readonly unknown[]): Promise<{
        readonly rows: readonly Record<string, unknown>[];
    }>;
}

type RuntimeFilter = {
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
    readonly select?: Readonly<Record<string, boolean>>;
    readonly orderBy?: readonly Readonly<Record<string, "asc" | "desc">>[];
    readonly take?: number;
    readonly skip?: number;
};

type RuntimeAggregateArgs = {
    readonly where?: RuntimeFindManyArgs["where"];
    readonly count?: true;
    readonly min?: readonly string[];
    readonly max?: readonly string[];
    readonly sum?: readonly string[];
};

export class PqsQueryClient implements QueryClient {
    public readonly source = QuerySource.pqs;
    public readonly contracts = {
        findMany: (args: ContractFindManyArgs = {}) => this.findContractsAsync(args),
        findUnique: (args: ContractFindUniqueArgs) =>
            this.findContractsAsync({
                where: { contractId: { equals: args.where.contractId } },
                select: args.select,
                take: 1,
            }).then((rows) => rows[0]),
        count: async (args: ContractCountArgs = {}) =>
            (await this.findContractsAsync(args)).length,
        aggregate: async (args: Parameters<QueryClient["contracts"]["aggregate"]>[0]) => this.aggregateContractsAsync(args),
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

        const findMany = async (args: RuntimeFindManyArgs = {}) => this.readPhysicalAsync(relation, metadata, args);

        const delegate = {
            findMany,
            count: async (args: { readonly where?: RuntimeFindManyArgs["where"] } = {}) => {
                const { where, values } = this.compileWhere(relation, metadata, args.where);

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
        };

        if (!hasUnique) {
            return delegate;
        }

        return {
            ...delegate,
            findUnique: async (args: { readonly where: Readonly<Record<string, unknown>>; readonly select?: RuntimeFindManyArgs["select"] }) => {
                this.assertUniqueWhere(relation, metadata, args.where);

                return findMany({
                    where: Object.fromEntries(Object.entries(args.where).map(([field, value]) => [field, { equals: value }])),
                    select: args.select,
                    take: 1,
                }).then((rows) => rows[0]);
            },
        };
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

        try {
            await this.ready;

            const result = await this.executor.query(
                `select ${selection} from ${this.profile.relation(relation)}${where}${orderBy}${limit}${offset}`,
                parameters,
            );

            return result.rows.map((row) => this.mapPhysicalRow(row, metadata, selected));
        } catch (cause) {
            throw this.wrap(`${relation}.findMany`, cause);
        }
    }

    private async aggregatePhysicalAsync(
        relation: PqsRelation,
        metadata: PqsRelationMetadata,
        args: RuntimeAggregateArgs,
    ): Promise<{ readonly count?: number; readonly min?: Readonly<Record<string, string | null>>; readonly max?: Readonly<Record<string, string | null>>; readonly sum?: Readonly<Record<string, string | null>> }> {
        const { where, values } = this.compileWhere(relation, metadata, args.where);

        const selected: string[] = [];

        if (args.count) {
            selected.push("count(*)::text as count");
        }

        for (const [operation, fields] of [["min", args.min], ["max", args.max], ["sum", args.sum]] as const) {
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

            for (const [operation, fields] of [["min", args.min], ["max", args.max], ["sum", args.sum]] as const) {
                if (fields !== undefined) {
                    result[operation] = Object.fromEntries(fields.map((field) => [field, nullableString(row[`${operation}_${field}`])]));
                }
            }

            return result;
        } catch (cause) {
            throw this.wrap(`${relation}.aggregate`, cause);
        }
    }

    private compileWhere(relation: PqsRelation, metadata: PqsRelationMetadata, filters: RuntimeFindManyArgs["where"]): { readonly where: string; readonly values: readonly unknown[] } {
        const values: unknown[] = [];

        const add = (value: unknown) => {
            values.push(value);

            return `$${values.length}`;
        };

        const compile = (expression: RuntimeFindManyArgs["where"]): string => {
        const conditions: string[] = [];
        for (const [field, filter] of Object.entries(expression ?? {})) {
            if (field === "and" || field === "or") { if (!Array.isArray(filter)) throw new Error(`${field} must be an array`); conditions.push(filter.length ? `(${filter.map((child) => compile(child)).join(` ${field} `)})` : field === "and" ? "true" : "false"); continue; }
            if (field === "not") { if (filter === null || Array.isArray(filter) || typeof filter !== "object") throw new Error("not must be an expression"); conditions.push(`not (${compile(filter as RuntimeFindManyArgs["where"])})`); continue; }
            const column = this.field(relation, metadata, field);
            if (filter === null || Array.isArray(filter) || typeof filter !== "object") throw new Error(`${field} must be a filter`);
            const scalar = filter as RuntimeFilter;

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

    private selectedFields(relation: PqsRelation, metadata: PqsRelationMetadata, select: RuntimeFindManyArgs["select"]): readonly (readonly [string, string])[] {
        if (select === undefined) {
            return Object.entries(metadata.fields);
        }

        const selected = Object.entries(select).filter(([, enabled]) => enabled).map(([field]) => [field, this.field(relation, metadata, field)] as const);

        if (selected.length === 0) {
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

    private mapPhysicalRow(row: Record<string, unknown>, metadata: PqsRelationMetadata, fields: readonly (readonly [string, string])[]): Record<string, unknown> {
        return Object.fromEntries(fields
            .filter(([field]) => Object.hasOwn(row, field))
            .map(([field]) => [field, mapPhysicalValue(row[field], metadata, field)]));
    }

    private async findContractsAsync(args: ContractFindManyArgs | ContractCountArgs): Promise<readonly ContractRow[]> {
        const compiled = compileContractFindMany(args, this.profile);

        try {
            const rows = (await this.executor.query(compiled.text, compiled.values)).rows.map(mapContractRow);

            const select = "select" in args ? args.select : undefined;

            if (select === undefined) {
                return rows;
            }

            const fields = Object.entries(select).filter(([, enabled]) => enabled).map(([field]) => field);

            if (fields.length === 0) {
                throw new Error("select must include at least one field");
            }

            return rows.map((row) => Object.fromEntries(fields.map((field) => [field, row[field as keyof ContractRow]])) as unknown as ContractRow);
        } catch (cause) {
            throw this.wrap("contracts.findMany", cause);
        }
    }

    private async aggregateContractsAsync(args: Parameters<QueryClient["contracts"]["aggregate"]>[0]): Promise<Awaited<ReturnType<QueryClient["contracts"]["aggregate"]>>> {
        if (!args.count && args.min === undefined && args.max === undefined && args.sum === undefined) {
            throw new Error("aggregate must request at least one result");
        }

        const rows = await this.findContractsAsync({ where: args.where });

        const result: {
            count?: number;
            min?: Partial<Record<"createdEventOffset" | "archivedEventOffset", string | null>>;
            max?: Partial<Record<"createdEventOffset" | "archivedEventOffset", string | null>>;
            sum?: Partial<Record<"createdEventOffset" | "archivedEventOffset", string | null>>;
        } = {};

        if (args.count) {
            result.count = rows.length;
        }

        for (const [operation, fields] of [["min", args.min], ["max", args.max], ["sum", args.sum]] as const) {
            if (fields !== undefined) {
                result[operation] = Object.fromEntries(fields.map((field) => [field, aggregateNumeric(rows.map((row) => row[field]), operation)]));
            }
        }

        return result;
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

function mapContractRow(row: Record<string, unknown>): ContractRow {
    return { contractId: String(row.contract_id), templateId: { packageId: String(row.template_package_id), moduleName: String(row.template_module_name), entityName: String(row.template_entity_name) }, packageId: nullableString(row.package_id), payload: row.payload, witnesses: stringArray(row.witnesses), createdEventOffset: String(row.created_event_offset), createdAt: nullableDate(row.created_at), archivedEventOffset: nullableString(row.archived_event_offset), archivedAt: nullableDate(row.archived_at), active: row.active === true };
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
