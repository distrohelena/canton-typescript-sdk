import type { PackageServiceClient } from "../../services/package/package-service-client.js";
import type { StateServiceClient } from "../../services/state/state-service-client.js";
import type { UpdateServiceClient } from "../../services/update/update-service-client.js";
import { ValidationError } from "../../core/errors/validation-error.js";
import { QueryCapabilityError } from "../errors/query-capability-error.js";
import { InMemoryQueryEvaluator } from "../canonical/in-memory-query-evaluator.js";
import { createQueryDataset, type QueryDataset, type QueryRow } from "../canonical/query-dataset.js";
import type { NormalizedAggregateQuery, NormalizedCountQuery, NormalizedFindManyQuery, NormalizedFindUniqueQuery, NormalizedGroupByQuery, NormalizedInclude, QueryPredicate } from "../canonical/query-ast.js";
import { normalizeAggregate, normalizeCount, normalizeFindMany, normalizeFindUnique, normalizeGroupBy } from "../canonical/query-normalizer.js";
import { queryRelationEdges, queryRelations, type QueryRelation } from "../canonical/query-schema.js";
import type { ContractCacheArgs, ContractCacheResult, QueryClient } from "../query-client.js";
import { QuerySource } from "../query-source.js";
import { GrpcContractCache } from "./grpc-contract-cache.js";
import { createGrpcQueryDataset, mapGrpcQueryRelationFragment, referencedGrpcPackageIds, type GrpcQueryRelationFragment } from "./grpc-relation-mapper.js";
import { GrpcPackageRelationReader } from "./grpc-package-relation-reader.js";
import { GrpcQuerySnapshotReader } from "./grpc-query-snapshot-reader.js";

type NormalizedQuery = NormalizedFindManyQuery | NormalizedFindUniqueQuery | NormalizedCountQuery | NormalizedAggregateQuery | NormalizedGroupByQuery;

/** The sole transport boundary used by every typed gRPC query delegate. */
interface GrpcQueryDataProvider {
    readDatasetAsync(query: NormalizedQuery): Promise<QueryDataset>;
}

export interface GrpcQueryClientOptions {
    readonly stateService: Pick<StateServiceClient, "getLedgerEndAsync" | "getLatestPrunedOffsetsAsync" | "getActiveContractsPageAsync">;
    readonly updateService: Pick<UpdateServiceClient, "getUpdatesPageAsync">;
    readonly packageService: Pick<PackageServiceClient, "listPackagesAsync" | "getPackageAsync">;
    readonly contractCache?: GrpcContractCache;
    readonly endpointScope?: string;
}

export class GrpcQueryClient implements QueryClient {
    public readonly source = QuerySource.grpc;
    private readonly evaluator = new InMemoryQueryEvaluator();
    private readonly dataProvider: GrpcQueryDataProvider;

    public readonly contracts = this.delegate("contracts") as QueryClient["contracts"];
    public readonly contractTypes = this.delegate("contractTypes") as QueryClient["contractTypes"];
    public readonly events = this.delegate("events") as QueryClient["events"];
    public readonly exercises = this.collectionDelegate("exercises") as QueryClient["exercises"];
    public readonly exerciseTypes = this.delegate("exerciseTypes") as QueryClient["exerciseTypes"];
    public readonly packages = this.delegate("packages") as QueryClient["packages"];
    public readonly transactions = this.delegate("transactions") as QueryClient["transactions"];
    public readonly watermark = this.delegate("watermark") as QueryClient["watermark"];

    public constructor(private readonly options: GrpcQueryClientOptions, dataProvider?: GrpcQueryDataProvider) {
        this.dataProvider = dataProvider ?? new DefaultGrpcQueryDataProvider(options);
    }

    public async $queryRaw<TRow>(_sql: string, _values: readonly unknown[] = []): Promise<readonly TRow[]> {
        throw new QueryCapabilityError(QuerySource.grpc, "query.$queryRaw");
    }

    public async cacheContracts(args?: ContractCacheArgs): Promise<ContractCacheResult> {
        if (this.options.contractCache === undefined) {
            throw new ValidationError("gRPC contract caching requires configured cache storage and ttlMs.");
        }

        return this.options.contractCache.cacheContracts(args);
    }

    public async invalidateContractsCache(args?: ContractCacheArgs): Promise<void> {
        await this.options.contractCache?.invalidateContractsCache(args);
    }

    private delegate(relation: QueryRelation): object {
        return {
            findMany: async (args: unknown = {}) => this.execute(normalizeFindMany(relation, args)),
            findUnique: async (args: unknown) => this.execute(normalizeFindUnique(relation, args)),
            count: async (args: unknown = {}) => this.execute(normalizeCount(relation, args)),
            aggregate: async (args: unknown) => this.execute(normalizeAggregate(relation, args)),
            groupBy: async (args: unknown) => this.execute(normalizeGroupBy(relation, args)),
        };
    }

    private collectionDelegate(relation: QueryRelation): object {
        const delegate = this.delegate(relation) as Record<string, unknown>;

        delete delegate.findUnique;

        return delegate;
    }

    private async execute(query: NormalizedQuery): Promise<unknown> {
        const dataset = await this.dataProvider.readDatasetAsync(query);

        return this.evaluator.execute(dataset, query);
    }
}

class DefaultGrpcQueryDataProvider implements GrpcQueryDataProvider {
    private readonly snapshots: GrpcQuerySnapshotReader;
    private readonly packages: GrpcPackageRelationReader;

    public constructor(private readonly options: GrpcQueryClientOptions) {
        this.snapshots = new GrpcQuerySnapshotReader(options.stateService, options.updateService);
        this.packages = new GrpcPackageRelationReader(options.packageService);
    }

    public async readDatasetAsync(query: NormalizedQuery): Promise<QueryDataset> {
        const closure = relationClosure(query);

        const needsHistory = requiresHistory(query);

        const activeOnly = query.relation === "contracts" && isActiveOnly(query);

        const cached = activeOnly && !requiresPackageMetadata(closure) && this.options.contractCache !== undefined
            ? await this.options.contractCache.readSnapshotAsync({ parties: partiesFor(query) })
            : undefined;

        if (cached !== undefined && !needsHistory) {
            return cachedContractsDataset(cached.contracts as unknown as readonly QueryRow[], cached.activeAtOffset, this.options.endpointScope ?? "ledger");
        } else if (needsHistory) {
            const endInclusive = cached?.activeAtOffset ?? (await this.options.stateService.getLedgerEndAsync({})).offset;

            const history = await this.snapshots.readHistoryAsync(endInclusive);

            const transactions = history.updates.flatMap((response) => response.update.oneofKind === "transaction" ? [response.update.transaction] : []);

            const fragment = mapGrpcQueryRelationFragment(transactions);

            const fragmentForDataset = cached === undefined ? fragment : { ...fragment, contracts: cached.contracts };

            const packageMetadata = !requiresPackageMetadata(closure)
                ? []
                : query.relation === "packages" || query.relation === "contractTypes" || query.relation === "exerciseTypes"
                    ? await this.packages.readAllAsync()
                    : await this.packages.readPackagesAsync(referencedGrpcPackageIds(fragment));

            return packageMetadata.length === 0
                ? fragmentDataset(fragmentForDataset, endInclusive, this.options.endpointScope ?? "ledger")
                : createGrpcQueryDataset(fragment, packageMetadata, endInclusive, this.options.endpointScope ?? "ledger");
        }

        const endInclusive = (await this.options.stateService.getLedgerEndAsync({})).offset;

        if (query.relation === "packages" || query.relation === "contractTypes" || query.relation === "exerciseTypes") {
            return createGrpcQueryDataset(mapGrpcQueryRelationFragment([]), await this.packages.readAllAsync(), endInclusive, this.options.endpointScope ?? "ledger");
        } else if (query.relation === "watermark") {
            return createGrpcQueryDataset(mapGrpcQueryRelationFragment([]), [], endInclusive, this.options.endpointScope ?? "ledger");
        }

        const active = await this.snapshots.readActiveContractsAsync(endInclusive, partiesFor(query));

        const fragment = mapGrpcQueryRelationFragment([], active.activeContracts);

        return requiresPackageMetadata(closure)
            ? createGrpcQueryDataset(fragment, await this.packages.readPackagesAsync(referencedGrpcPackageIds(fragment)), endInclusive, this.options.endpointScope ?? "ledger")
            : fragmentDataset(fragment, endInclusive, this.options.endpointScope ?? "ledger", false);
    }
}

function requiresHistory(query: NormalizedQuery): boolean {
    if (query.relation === "transactions" || query.relation === "events" || query.relation === "exercises") {
        return true;
    } else if (query.relation === "contracts" && !isActiveOnly(query)) {
        return true;
    }

    return predicateRequiresHistory(query.relation, query.predicate) || includesRequireHistory(query.relation, includesFor(query));
}

function partiesFor(query: NormalizedQuery): readonly string[] | undefined {
    return query.kind === "findMany" || query.kind === "count" ? query.parties : undefined;
}

function includesFor(query: NormalizedQuery): readonly NormalizedInclude[] {
    return query.kind === "findMany" || query.kind === "findUnique" ? query.includes : [];
}

function isActiveOnly(query: NormalizedQuery): boolean {
    if (query.kind === "findMany" || query.kind === "count") {
        return query.activeOnly;
    }

    return predicateProvesActive(query.predicate);
}

function predicateProvesActive(predicate: QueryPredicate | undefined): boolean {
    if (predicate === undefined) {
        return false;
    } else if (predicate.kind === "scalar") {
        return predicate.path.length === 1 && predicate.path[0] === "active" && predicate.operator === "equals" && predicate.value === true;
    } else if (predicate.kind === "and") {
        return predicate.children.some(predicateProvesActive);
    } else if (predicate.kind === "or") {
        return predicate.children.length > 0 && predicate.children.every(predicateProvesActive);
    }

    return false;
}

function requiresPackageMetadata(closure: ReadonlySet<QueryRelation>): boolean {
    return closure.has("packages") || closure.has("contractTypes") || closure.has("exerciseTypes");
}

function predicateRequiresHistory(relation: QueryRelation, predicate: QueryPredicate | undefined): boolean {
    if (predicate === undefined || predicate.kind === "scalar") {
        return false;
    } else if (predicate.kind === "not") {
        return predicateRequiresHistory(relation, predicate.child);
    } else if (predicate.kind === "and" || predicate.kind === "or") {
        return predicate.children.some((child) => predicateRequiresHistory(relation, child));
    } else if (predicate.kind !== "relation") {
        return false;
    }

    const target = queryRelationEdges[relation]?.[predicate.edge]?.target;

    return target === "contracts" || target === "transactions" || target === "events" || target === "exercises" || target !== undefined && predicateRequiresHistory(target, predicate.predicate);
}

function includesRequireHistory(relation: QueryRelation, includes: readonly NormalizedInclude[]): boolean {
    return includes.some((include) => include.relation === "contracts" || include.relation === "transactions" || include.relation === "events" || include.relation === "exercises" || predicateRequiresHistory(include.relation, include.predicate) || includesRequireHistory(include.relation, include.includes));
}

function relationClosure(query: NormalizedQuery): ReadonlySet<QueryRelation> {
    const relations = new Set<QueryRelation>([query.relation]);

    const visitPredicate = (relation: QueryRelation, predicate: QueryPredicate | undefined): void => {
        if (predicate === undefined || predicate.kind === "scalar") {
            return;
        } else if (predicate.kind === "relation") {
            const target = queryRelationEdges[relation]?.[predicate.edge]?.target;

            if (target !== undefined) {
                relations.add(target);
                visitPredicate(target, predicate.predicate);
            }
        } else if (predicate.kind === "not") {
            visitPredicate(relation, predicate.child);
        } else {
            predicate.children.forEach((child) => visitPredicate(relation, child));
        }
    };

    const visitIncludes = (relation: QueryRelation, includes: readonly NormalizedInclude[]): void => {
        for (const include of includes) {
            relations.add(include.relation);
            visitPredicate(include.relation, include.predicate);
            visitIncludes(include.relation, include.includes);
        }
    };

    visitPredicate(query.relation, query.predicate);
    visitIncludes(query.relation, includesFor(query));

    if (query.kind === "groupBy") {
        for (const group of query.by) {
            addRelationPath(query.relation, group.path, relations);
        }
    } else if (query.kind === "findMany") {
        for (const order of query.orderBy) {
            addRelationPath(query.relation, order.path, relations);
        }
    }

    return relations;
}

function addRelationPath(relation: QueryRelation, path: readonly string[], relations: Set<QueryRelation>): void {
    if (path.length > 1) {
        const target = queryRelationEdges[relation]?.[path[0]!]?.target;

        if (target !== undefined) {
            relations.add(target);
        }
    }
}

function cachedContractsDataset(contracts: readonly QueryRow[], offset: string, instanceId: string): QueryDataset {
    const empty = [] as const;

    return basicDataset({ contracts: contracts as never, transactions: empty, events: empty, exercises: empty }, offset, instanceId, false);
}

function fragmentDataset(fragment: Pick<GrpcQueryRelationFragment, "contracts" | "transactions" | "events" | "exercises">, offset: string, instanceId: string, completeHistoryEdges = true): QueryDataset {
    return basicDataset(fragment, offset, instanceId, completeHistoryEdges);
}

function basicDataset(rows: Pick<GrpcQueryRelationFragment, "contracts" | "transactions" | "events" | "exercises">, offset: string, instanceId: string, completeHistoryEdges = true): QueryDataset {
    const empty = [] as const;

    return createQueryDataset({
        rows: { contracts: rows.contracts as unknown as readonly QueryRow[], contractTypes: empty, events: rows.events as unknown as readonly QueryRow[], exercises: rows.exercises as unknown as readonly QueryRow[], exerciseTypes: empty, packages: empty, transactions: rows.transactions as unknown as readonly QueryRow[], watermark: [{ singleton: true, ix: offset, offset, instanceId }] },
        sourceLocalKeys: { contracts: [["contractId"]], contractTypes: [["pk"]], events: [["pk"]], exercises: [["tpePk", "contractTpePk", "exerciseEventPk", "contractId"]], exerciseTypes: [["pk"]], packages: [["pk"], ["id"]], transactions: [["ix"], ["offset"]], watermark: [["singleton"]] },
        edges: Object.fromEntries(queryRelations.map((relation) => [relation, Object.fromEntries(Object.keys(queryRelationEdges[relation] ?? {}).map((edge: string) => [edge, { ...cachedEdgePaths(relation, edge), ...(completeHistoryEdges ? completeFragmentEdge(relation, edge) : { complete: false }) }]))])) as QueryDataset["edges"],
    });
}

function completeFragmentEdge(relation: QueryRelation, edge: string): { readonly complete?: boolean } {
    const complete = new Set([
        "contracts.createdTransaction", "contracts.archivedTransaction", "contracts.exercises",
        "events.transaction", "events.exercises",
        "exercises.event", "exercises.transaction", "exercises.contract",
        "transactions.events", "transactions.createdContracts", "transactions.archivedContracts", "transactions.exercises",
    ]);

    return complete.has(`${relation}.${edge}`) ? {} : { complete: false };
}

function cachedEdgePaths(relation: QueryRelation, edge: string): { readonly from: readonly string[]; readonly to: readonly string[] } {
    const paths: Record<string, { readonly from: readonly string[]; readonly to: readonly string[] }> = {
        "contracts.contractType": { from: ["contractId"], to: ["pk"] }, "contracts.createdTransaction": { from: ["createdEventOffset"], to: ["ix"] }, "contracts.archivedTransaction": { from: ["archivedEventOffset"], to: ["ix"] }, "contracts.exercises": { from: ["contractId"], to: ["contractId"] },
        "contractTypes.contracts": { from: ["pk"], to: ["contractId"] }, "contractTypes.exercises": { from: ["pk"], to: ["contractTpePk"] }, "events.transaction": { from: ["txIx"], to: ["ix"] }, "events.exercises": { from: ["pk"], to: ["exerciseEventPk"] },
        "exercises.exerciseType": { from: ["tpePk"], to: ["pk"] }, "exercises.contractType": { from: ["contractTpePk"], to: ["pk"] }, "exercises.event": { from: ["exerciseEventPk"], to: ["pk"] }, "exercises.transaction": { from: ["exercisedAtIx"], to: ["ix"] }, "exercises.package": { from: ["packagePk"], to: ["pk"] }, "exercises.contract": { from: ["contractId"], to: ["contractId"] },
        "exerciseTypes.exercises": { from: ["pk"], to: ["tpePk"] }, "packages.exercises": { from: ["pk"], to: ["packagePk"] }, "transactions.events": { from: ["ix"], to: ["txIx"] }, "transactions.createdContracts": { from: ["ix"], to: ["createdEventOffset"] }, "transactions.archivedContracts": { from: ["ix"], to: ["archivedEventOffset"] }, "transactions.exercises": { from: ["ix"], to: ["exercisedAtIx"] },
    };

    return paths[`${relation}.${edge}`]!;
}
