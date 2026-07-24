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
        findUnique: (args: ContractFindUniqueArgs) =>
            this.findManyAsync({ where: { contractId: { equals: args.where.contractId } } }).then(
                (rows) => rows[0],
            ),
        count: async (args: ContractCountArgs = {}) =>
            (await this.findManyAsync(args)).length,
    };
    public readonly contractTypes = this.unsupported("contractTypes.findMany");
    public readonly events = this.unsupported("events.findMany");
    public readonly exercises = this.unsupported("exercises.findMany");
    public readonly exerciseTypes = this.unsupported("exerciseTypes.findMany");
    public readonly packages = this.unsupported("packages.findMany");
    public readonly transactions = this.unsupported("transactions.findMany");
    public readonly watermark = this.unsupported("watermark.findMany");

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
        if (args.where?.active === false || args.where?.packageId !== undefined) {
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
            findMany: async (): Promise<readonly Record<string, unknown>[]> => {
                throw new QueryCapabilityError(QuerySource.grpc, operation);
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
