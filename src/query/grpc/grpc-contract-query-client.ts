import { GetActiveContractsPageRequest } from "../../core/types/requests/get-active-contracts-page-request.js";
import { StateServiceClient } from "../../services/state/state-service-client.js";
import { QueryCacheStore } from "../cache/query-cache-store.js";
import {
    ContractCountArgs,
    ContractFindManyArgs,
    ContractFindUniqueArgs,
    ContractRow,
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
        findMany: (args: ContractFindManyArgs = {}) => this.findManyAsync(args),
        findUnique: (args: ContractFindUniqueArgs) => {
            if (args.select !== undefined) {
                return Promise.reject(new QueryCapabilityError(QuerySource.grpc, "contracts.findUnique"));
            }

            return this.findManyAsync({ where: { contractId: { equals: args.where.contractId } } }).then(
                (rows) => rows[0],
            );
        },
        count: async (args: ContractCountArgs = {}) =>
            (await this.findManyAsync(args)).length,
        aggregate: async (): Promise<never> => {
            throw new QueryCapabilityError(QuerySource.grpc, "contracts.aggregate");
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
            args.where?.active === false ||
            args.where?.packageId !== undefined ||
            args.where?.witnesses !== undefined ||
            args.where?.contractId?.in !== undefined ||
            args.where?.contractId?.is !== undefined ||
            args.where?.contractId?.isNot !== undefined ||
            args.where?.templateId?.in !== undefined ||
            args.where?.templateId?.is !== undefined ||
            args.where?.templateId?.isNot !== undefined
        ) {
            throw new QueryCapabilityError(QuerySource.grpc, "contracts.findMany");
        }

        const findArgs = args as ContractFindManyArgs;

        if (findArgs.select !== undefined || findArgs.orderBy !== undefined || findArgs.skip !== undefined || findArgs.take !== undefined) {
            throw new QueryCapabilityError(QuerySource.grpc, "contracts.findMany");
        }

        const snapshot = await this.readSnapshotAsync(args.parties);

        let rows = snapshot.filter((row) =>
            args.where?.contractId?.equals === undefined
                ? true
                : row.contractId === args.where.contractId.equals,
        );

        if (args.where?.templateId?.equals !== undefined) {
            rows = rows.filter(
                (row) => row.templateId === args.where?.templateId?.equals,
            );
        }

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
            rows.push(...response.contracts.map(mapGrpcContract));
        } while (pageToken !== undefined && pageToken.length > 0);

        if (this.cache !== undefined && this.cacheTtlMs !== undefined) {
            await this.cache.setAsync(key, rows, this.cacheTtlMs);
        }

        return rows;
    }
}

function mapGrpcContract(value: unknown): ContractRow {
    const row = value as {
        contractId?: string;
        templateId?: { packageId?: string; moduleName?: string; entityName?: string };
    };

    const template = row.templateId;

    return {
        contractId: row.contractId ?? "",
        templateId: `${template?.packageId ?? ""}:${template?.moduleName ?? ""}:${template?.entityName ?? ""}`,
        packageId: null,
        payload: undefined,
        witnesses: [],
        createdEventOffset: "",
        createdAt: null,
        archivedEventOffset: null,
        archivedAt: null,
        active: true,
    };
}
