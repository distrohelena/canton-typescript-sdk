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
    PqsSchemaProfileV1,
    requiredPqsColumns,
} from "./pqs-schema-profile.js";
import { assertReadOnlySql } from "./read-only-sql.js";

export interface PqsQueryExecutor {
    query(
        text: string,
        values: readonly unknown[],
    ): Promise<{ readonly rows: readonly Record<string, unknown>[] }>;
}

export class PqsQueryClient implements QueryClient {
    public readonly source = QuerySource.pqs;
    public readonly contracts = {
        findMany: (args: ContractFindManyArgs = {}) =>
            this.findContractsAsync(args),
        findUnique: (args: ContractFindUniqueArgs) =>
            this.findContractsAsync({
                where: { contractId: { equals: args.where.contractId } },
                select: args.select,
                take: 1,
            }).then((rows) => rows[0]),
        count: async (args: ContractCountArgs = {}) =>
            (await this.findContractsAsync(args)).length,
    };
    public readonly contractTypes = this.createPhysicalDelegate("__contract_tpe");
    public readonly events = this.createPhysicalDelegate("__events");
    public readonly exercises = this.createPhysicalDelegate("__exercises");
    public readonly exerciseTypes = this.createPhysicalDelegate("__exercise_tpe");
    public readonly packages = this.createPhysicalDelegate("__packages");
    public readonly transactions = this.createPhysicalDelegate("__transactions");
    public readonly watermark = this.createPhysicalDelegate("__watermark");

    public constructor(
        private readonly executor: PqsQueryExecutor,
        private readonly profile: PqsSchemaProfileV1,
    ) {}

    public async $queryRaw<TRow>(
        sql: string,
        values: readonly unknown[] = [],
    ): Promise<readonly TRow[]> {
        assertReadOnlySql(sql);

        try {
            const result = await this.executor.query(sql, values);

            return result.rows as readonly TRow[];
        } catch (cause) {
            throw new PqsQueryError({
                operation: "$queryRaw",
                code: getPqsCode(cause),
                cause,
            });
        }
    }

    private createPhysicalDelegate(relation: PqsRelation) {
        return {
            findMany: async (args: {
                readonly where?: Readonly<Record<string, { readonly equals?: unknown }>>;
                readonly select?: Readonly<Record<string, boolean>>;
            readonly take?: number;
            readonly skip?: number;
        } = {}): Promise<readonly Record<string, unknown>[]> => {
                for (const field of [
                    ...Object.keys(args.where ?? {}),
                    ...Object.keys(args.select ?? {}),
                ]) {
                    if (!requiredPqsColumns[relation].includes(field)) {
                        throw new Error(`${field} is not a field of ${relation}`);
                    }
                }

                try {
                    const values: unknown[] = [];
                    const add = (value: unknown) => {
                        values.push(value);
                        return `$${values.length}`;
                    };
                    const selection = args.select === undefined
                        ? "*"
                        : Object.entries(args.select).filter(([, selected]) => selected).map(([field]) => `"${field}"`).join(", ");
                    const conditions = Object.entries(args.where ?? {}).map(([field, filter]) => `"${field}" = ${add(filter.equals)}`);
                    const where = conditions.length === 0 ? "" : ` where ${conditions.join(" and ")}`;
                    const limit = args.take === undefined ? "" : ` limit ${add(args.take)}`;
                    const offset = args.skip === undefined ? "" : ` offset ${add(args.skip)}`;
                    const result = await this.executor.query(
                        `select ${selection} from ${this.profile.relation(relation)}${where}${limit}${offset}`,
                        values,
                    );

                    return result.rows;
                } catch (cause) {
                    throw new PqsQueryError({
                        operation: `${relation}.findMany`,
                        code: getPqsCode(cause),
                        cause,
                    });
                }
            },
        };
    }

    private async findContractsAsync(
        args: ContractFindManyArgs | ContractCountArgs,
    ): Promise<readonly ContractRow[]> {
        const compiled = compileContractFindMany(args, this.profile);

        try {
            const result = await this.executor.query(compiled.text, compiled.values);

            return result.rows.map(mapContractRow);
        } catch (cause) {
            throw new PqsQueryError({
                operation: "contracts.findMany",
                code: getPqsCode(cause),
                cause,
            });
        }
    }
}

function mapContractRow(row: Record<string, unknown>): ContractRow {
    return {
        contractId: String(row.contract_id),
        templateId: String(row.template_id),
        packageId: nullableString(row.package_id),
        payload: row.payload,
        witnesses: stringArray(row.witnesses),
        createdEventOffset: String(row.created_event_offset),
        createdAt: nullableDate(row.created_at),
        archivedEventOffset: nullableString(row.archived_event_offset),
        archivedAt: nullableDate(row.archived_at),
        active: row.active === true,
    };
}

function nullableString(value: unknown): string | null {
    return typeof value === "string" ? value : value === null ? null : String(value);
}

function nullableDate(value: unknown): Date | null {
    return value instanceof Date ? value : value === null || value === undefined ? null : new Date(String(value));
}

function stringArray(value: unknown): readonly string[] {
    return Array.isArray(value) ? value.map(String) : [];
}

function getPqsCode(cause: unknown): string | undefined {
    return typeof cause === "object" && cause !== null && "code" in cause && typeof cause.code === "string"
        ? cause.code
        : undefined;
}
