import { GetActiveContractsPageRequest } from "../../core/types/requests/get-active-contracts-page-request.js";
import { StateServiceClient } from "../../services/state/state-service-client.js";
import { QueryCacheStore } from "../cache/query-cache-store.js";
import {
    ContractCountArgs,
    ContractFindManyArgs,
    ContractFindUniqueArgs,
    ContractRow,
    ContractResult,
    JsonProjectionResult,
} from "../model-types.js";
import { QueryCapabilityError } from "../errors/query-capability-error.js";
import { QueryClient } from "../query-client.js";
import { QuerySource } from "../query-source.js";

type ActiveContractsReader = Pick<
    StateServiceClient,
    "getActiveContractsPageAsync"
>;

export class GrpcContractQueryClient implements QueryClient {
    public readonly source = QuerySource.grpc;
    public readonly contracts = {
        findMany: <TArgs extends ContractFindManyArgs>(args: TArgs = {} as TArgs) => this.findManyAsync(args).then((rows) => rows as readonly (ContractResult & JsonProjectionResult<TArgs>)[]),
        findUnique: <TArgs extends ContractFindUniqueArgs>(args: TArgs) => {
            if (args.select !== undefined || args.include !== undefined) {
                return Promise.reject(new QueryCapabilityError(QuerySource.grpc, "contracts.findUnique"));
            }

            return this.findManyAsync({ where: { contractId: { equals: args.where.contractId } } }).then(
                (rows) => rows[0] as (ContractResult & JsonProjectionResult<TArgs>) | undefined,
            );
        },
        count: async (args: ContractCountArgs = {}) =>
            (await this.findManyAsync(args)).length,
        aggregate: async (): Promise<never> => {
            throw new QueryCapabilityError(QuerySource.grpc, "contracts.aggregate");
        },
        groupBy: async (): Promise<never> => {
            throw new QueryCapabilityError(QuerySource.grpc, "contracts.groupBy");
        },
    };
    public readonly contractTypes = this.unsupported("contractTypes") as QueryClient["contractTypes"];
    public readonly events = this.unsupported("events") as QueryClient["events"];
    public readonly exercises = this.unsupported("exercises") as QueryClient["exercises"];
    public readonly exerciseTypes = this.unsupported("exerciseTypes") as QueryClient["exerciseTypes"];
    public readonly packages = this.unsupported("packages") as QueryClient["packages"];
    public readonly transactions = this.unsupported("transactions") as QueryClient["transactions"];
    public readonly watermark = this.unsupported("watermark") as QueryClient["watermark"];

    public constructor(
        private readonly stateService: ActiveContractsReader,
        private readonly cache: QueryCacheStore | undefined,
        private readonly cacheTtlMs: number | undefined,
        private readonly cacheScope: string,
    ) {}

    public async $queryRaw<TRow>(
        _sql: string,
        _values: readonly unknown[] = [],
    ): Promise<readonly TRow[]> {
        throw new QueryCapabilityError(QuerySource.grpc, "query.$queryRaw");
    }

    private async findManyAsync(
        args: ContractFindManyArgs | ContractCountArgs,
    ): Promise<readonly ContractRow[]> {
        if (
            hasUnsupportedFilter(args.where as Record<string, unknown> | undefined) ||
            args.where?.active === false ||
            args.where?.packageId !== undefined ||
            args.where?.witnesses !== undefined ||
            args.where?.contractId?.in !== undefined ||
            args.where?.contractId?.is !== undefined ||
            args.where?.contractId?.isNot !== undefined ||
            args.where?.templateId !== undefined
        ) {
            throw new QueryCapabilityError(QuerySource.grpc, "contracts.findMany");
        }

        const findArgs = args as ContractFindManyArgs;

        if (findArgs.select !== undefined || findArgs.include !== undefined || findArgs.orderBy !== undefined || findArgs.skip !== undefined || findArgs.take !== undefined) {
            throw new QueryCapabilityError(QuerySource.grpc, "contracts.findMany");
        }

        const snapshot = await this.readSnapshotAsync(args.parties);

        let rows = snapshot.filter((row) =>
            args.where?.contractId?.equals === undefined
                ? true
                : row.contractId === args.where.contractId.equals,
        );
        if (args.where?.payload !== undefined) rows = rows.filter((row) => matchesPayload(row.payload, args.where!.payload!));

        return rows;
    }

    private unsupported(operation: string) {
        return {
            findMany: async (): Promise<never> => {
                throw new QueryCapabilityError(QuerySource.grpc, `${operation}.findMany`);
            },
            findUnique: async (): Promise<never> => {
                throw new QueryCapabilityError(QuerySource.grpc, `${operation}.findUnique`);
            },
            count: async (): Promise<never> => {
                throw new QueryCapabilityError(QuerySource.grpc, `${operation}.count`);
            },
            aggregate: async (): Promise<never> => {
                throw new QueryCapabilityError(QuerySource.grpc, `${operation}.aggregate`);
            },
            groupBy: async (): Promise<never> => {
                throw new QueryCapabilityError(QuerySource.grpc, `${operation}.groupBy`);
            },
        };
    }

    private async readSnapshotAsync(
        parties: readonly string[] | undefined,
    ): Promise<readonly ContractRow[]> {
        const key = `${this.cacheScope}:${parties?.join(",") ?? "*"}`;

        const cached = this.cache === undefined ? undefined : await this.cache.getAsync<readonly ContractRow[]>(key);

        if (cached !== undefined) {
            return cached;
        }

        const rows: ContractRow[] = [];

        let pageToken: Uint8Array | undefined;

        let activeAtOffset: string | undefined;

        do {
            const response = await this.stateService.getActiveContractsPageAsync(
                new GetActiveContractsPageRequest(
                    parties === undefined
                        ? { allParties: true, activeAtOffset, pageToken }
                        : { parties, activeAtOffset, pageToken },
                ),
            );

            activeAtOffset ??= response.activeAtOffset;
            pageToken = response.nextPageToken;
            rows.push(
                ...response.activeContracts.map((response) =>
                    mapGrpcContract(
                        response.contractEntry.oneofKind === "activeContract"
                            ? response.contractEntry.activeContract
                            : response,
                    ),
                ),
            );
        } while (pageToken !== undefined && pageToken.length > 0);

        if (this.cache !== undefined && this.cacheTtlMs !== undefined) {
            await this.cache.setAsync(key, rows, this.cacheTtlMs);
        }

        return rows;
    }
}

function hasUnsupportedFilter(where: Record<string, unknown> | undefined): boolean {
    if (where === undefined) return false;
    if ("and" in where || "or" in where || "not" in where || "createdEventOffset" in where || "createdAt" in where || "archivedEventOffset" in where || "archivedAt" in where) return true;
    for (const field of ["contractId", "templateId"] as const) {
        const filter = where[field] as Record<string, unknown> | undefined;
        if (filter !== undefined && Object.keys(filter).some((key) => key !== "equals")) return true;
    }
    return false;
}

function mapGrpcContract(value: unknown): ContractRow {
    const row = value as {
        contractId?: string;
        templateId?: { packageId?: string; moduleName?: string; entityName?: string };
        payload?: unknown;
    };

    const template = row.templateId;

    return {
        contractId: row.contractId ?? "",
        templateId: { packageId: template?.packageId ?? "", moduleName: template?.moduleName ?? "", entityName: template?.entityName ?? "" },
        packageId: null,
        payload: row.payload,
        witnesses: [],
        createdEventOffset: "",
        createdAt: null,
        archivedEventOffset: null,
        archivedAt: null,
        active: true,
    };
}

function matchesPayload(value: unknown, filter: Record<string, unknown>): boolean {
    const match = filter.match as Record<string, unknown> | undefined;
    if (match === undefined) return false;
    const visit = (current: unknown, node: Record<string, unknown>): boolean => Object.entries(node).every(([key, child]) => {
        const next = current !== null && typeof current === "object" ? (current as Record<string, unknown>)[key] : undefined;
        const predicate = child as Record<string, unknown>;
        if (Object.keys(predicate).some((name) => ["equals", "lt", "lte", "gt", "gte", "like", "ilike"].includes(name))) return compare(String(next ?? ""), predicate);
        return visit(next, predicate);
    });
    return visit(value, match);
}
function compare(value: string, filter: Record<string, unknown>): boolean { if (filter.equals !== undefined) return value === filter.equals; if (filter.like !== undefined || filter.ilike !== undefined) { const pattern = String(filter.like ?? filter.ilike).replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replaceAll("%", ".*").replaceAll("_", "."); return new RegExp(`^${pattern}$`, filter.ilike === undefined ? "" : "i").test(value); } if (filter.lt !== undefined) return value < String(filter.lt); if (filter.lte !== undefined) return value <= String(filter.lte); if (filter.gt !== undefined) return value > String(filter.gt); return value >= String(filter.gte); }
