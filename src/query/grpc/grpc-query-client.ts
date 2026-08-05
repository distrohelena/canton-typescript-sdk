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
import { contractTypeMetadataFromCreations, createGrpcQueryDataset, mapGrpcQueryRelationFragment, packageMetadataFromEvents, referencedGrpcPackageIds, type GrpcQueryRelationFragment } from "./grpc-relation-mapper.js";
import { GrpcPackageRelationReader } from "./grpc-package-relation-reader.js";
import { GrpcQuerySnapshotReader } from "./grpc-query-snapshot-reader.js";
import { validDottedNameString } from "./grpc-query-value-mapper.js";
import type { GrpcQueryTemplateRef } from "../../transports/grpc/mappers/contracts-mapper.js";

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
    /**
     * Opt-in: after the first history replay, keep the materialized window in memory and only fetch offsets
     * past it on later history queries — turning repeat full replays into delta reads. Off by default because
     * the retained window lives for this client's lifetime and its RAM cost is the full replayed history.
     */
    readonly incrementalHistory?: boolean;
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
        this.snapshots = new GrpcQuerySnapshotReader(options.stateService, options.updateService, { incrementalHistory: options.incrementalHistory });
        this.packages = new GrpcPackageRelationReader(options.packageService);
    }

    public async readDatasetAsync(query: NormalizedQuery): Promise<QueryDataset> {
        const closure = relationClosure(query);

        const needsHistory = requiresHistory(query);

        const activeOnly = query.relation === "contracts" && isActiveOnly(query);

        const cached = activeOnly && this.options.contractCache !== undefined
            ? await this.options.contractCache.readSnapshotAsync({ parties: partiesFor(query) })
            : undefined;

        if (cached !== undefined && !needsHistory && !requiresPackageMetadata(closure)) {
            return cachedContractsDataset(cached.contracts as unknown as readonly QueryRow[], cached.activeAtOffset, this.options.endpointScope ?? "ledger");
        } else if (needsHistory) {
            // With a warm incremental window only the new offsets are fetched, which is no longer worth a warning.
            if (!(this.options.incrementalHistory === true && this.snapshots.hasHistoryCache)) {
                console.warn(
                    `[GrpcQueryClient] Falling back to a full ledger replay from offset 0 for a "${query.relation}" query. `
                        + "This is expensive and should be an extreme edge case. It is usually triggered by a \"contracts\" query "
                        + "that does not explicitly prove `active: true` (so archived contracts may be in scope), or by querying "
                        + "\"transactions\"/\"events\"/\"exercises\" directly. Add an explicit active:true filter if only current state is needed"
                        + (this.options.incrementalHistory === true
                            ? "; incrementalHistory is enabled, so later history queries will fetch only new offsets."
                            : ", or enable the incrementalHistory option to fetch only new offsets on repeat history queries."),
                );
            }

            const endInclusive = cached?.activeAtOffset ?? (await this.options.stateService.getLedgerEndAsync({})).offset;

            const history = await this.snapshots.readHistoryAsync(endInclusive);

            const transactions = history.updates.flatMap((response) => response.update.oneofKind === "transaction" ? [response.update.transaction] : []);

            const fragment = mapGrpcQueryRelationFragment(transactions);

            // Catalog queries rooted at packages/contractTypes/exerciseTypes need every known package's
            // full type inventory, which only the decoded archives provide.
            const catalogRelation = query.relation === "packages" || query.relation === "contractTypes" || query.relation === "exerciseTypes";

            const closureNeedsExercises = closure.has("exercises") || closure.has("exerciseTypes");

            // Non-catalog metadata can usually come straight from the fetched events: creations always name
            // their own package, and direct exercises name their choice owner's. packageMetadataFromEvents
            // returns undefined when the window holds an interface-exercised choice (owner package name is
            // not on the event), and "packages" rows (version) have no event equivalent at all — both fall
            // back to the archive decode.
            const derivedMetadata = requiresPackageMetadata(closure) && !catalogRelation && !closure.has("packages")
                ? closureNeedsExercises
                    ? packageMetadataFromEvents(fragment)
                    : contractTypeMetadataFromCreations(fragment.creationIdentities)
                : undefined;

            const packageMetadata = !requiresPackageMetadata(closure)
                ? []
                : catalogRelation
                    ? await this.packages.readAllAsync()
                    : derivedMetadata ?? await this.packages.readPackagesAsync(referencedGrpcPackageIds(fragment));

            // When the closure never reads exercises, the replayed window's unrelated exercises are dropped:
            // createGrpcQueryDataset resolves canonical keys for every exercise present, and creations-only
            // metadata knows nothing about choices. When the closure does read exercises, the event-derived
            // metadata covers them and they stay.
            const datasetFragment = derivedMetadata !== undefined && !closureNeedsExercises ? { ...fragment, exercises: [] } : fragment;

            return packageMetadata.length === 0
                ? fragmentDataset(fragment, endInclusive, this.options.endpointScope ?? "ledger")
                : createGrpcQueryDataset(datasetFragment, packageMetadata, endInclusive, this.options.endpointScope ?? "ledger");
        }

        const endInclusive = cached?.activeAtOffset ?? (await this.options.stateService.getLedgerEndAsync({})).offset;

        if (query.relation === "packages" || query.relation === "contractTypes" || query.relation === "exerciseTypes") {
            // A proven-active where/include on "contracts" (see predicateRequiresHistory/includesRequireHistory)
            // can put "contracts" in the closure here without needsHistory being true, so the ACS still has to
            // be read — otherwise that where/include would silently resolve against an empty row set.
            const contractsFragment = closure.has("contracts")
                ? mapGrpcQueryRelationFragment([], (await this.snapshots.readActiveContractsAsync(endInclusive, partiesFor(query))).activeContracts)
                : mapGrpcQueryRelationFragment([]);

            return createGrpcQueryDataset(contractsFragment, await this.packages.readAllAsync(), endInclusive, this.options.endpointScope ?? "ledger");
        } else if (query.relation === "watermark") {
            return createGrpcQueryDataset(mapGrpcQueryRelationFragment([]), [], endInclusive, this.options.endpointScope ?? "ledger");
        }

        const active = await this.snapshots.readActiveContractsAsync(endInclusive, partiesFor(query), pushdownTemplateRefsFor(query));

        const fragment = mapGrpcQueryRelationFragment([], active.activeContracts);

        if (!requiresPackageMetadata(closure)) {
            return fragmentDataset(fragment, endInclusive, this.options.endpointScope ?? "ledger", false);
        }

        // Reaching here guarantees query.relation === "contracts" with needsHistory === false, which (per
        // predicateRequiresHistory/includesRequireHistory above) is only possible when the closure never
        // touches "exercises"/"exerciseTypes"/"packages"/"transactions"/"events" — those unconditionally force
        // history. So requiresPackageMetadata(closure) here can only be "contractTypes", and every contract in
        // this ACS-only fragment already carries its own packageName — no Package Service call needed.
        const packageMetadata = contractTypeMetadataFromCreations(fragment.creationIdentities);

        return createGrpcQueryDataset(fragment, packageMetadata, endInclusive, this.options.endpointScope ?? "ledger");
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
        if (predicate.path.length !== 1) {
            return false;
        }

        const [field] = predicate.path;

        // A contract is active iff archivedAt/archivedEventOffset are null, so either form proves the
        // same fact as active: true (kept in sync with provesActive in canonical/query-normalizer.ts).
        return field === "active"
            ? predicate.operator === "equals" && predicate.value === true
            : (field === "archivedAt" || field === "archivedEventOffset") && predicate.operator === "is" && predicate.value === null;
    } else if (predicate.kind === "and") {
        return predicate.children.some(predicateProvesActive);
    } else if (predicate.kind === "or") {
        return predicate.children.length > 0 && predicate.children.every(predicateProvesActive);
    }

    return false;
}

function requiresPackageMetadata(closure: ReadonlySet<QueryRelation>): boolean {
    return closure.has("packages") || closure.has("contractTypes") || closure.has("exercises") || closure.has("exerciseTypes");
}

const MAX_PUSHDOWN_TEMPLATE_FILTERS = 25;

/**
 * Extracts template filters the ACS request itself can apply, so non-matching contracts are never
 * downloaded or materialized. The participant scans its whole ACS either way — the win is wire volume and
 * client-side decode/freeze work, not node time. Correctness rule: the evaluator re-applies the complete
 * predicate over whatever rows come back, so a pushed filter set only has to be a SUPERSET of possible
 * matches — over-fetching is fine, under-fetching never happens because pins are only read from top-level
 * AND conjuncts (anything under or/not is ignored) and any single conjunct constrains every matching row.
 * Returns undefined (wildcard fetch) when no full package/module/entity pin can be proven or a pinned value
 * is not a syntactically valid identifier (a malformed value can never match, but pushing it would make the
 * node reject the request instead of returning the empty result the evaluator would produce).
 */
function pushdownTemplateRefsFor(query: NormalizedQuery): readonly GrpcQueryTemplateRef[] | undefined {
    if (query.relation !== "contracts") {
        return undefined;
    }

    const stringValues = (operator: string, value: unknown): readonly string[] | undefined => operator === "equals" && typeof value === "string"
        ? [value]
        : operator === "in" && Array.isArray(value) && value.every((item) => typeof item === "string") ? value as readonly string[] : undefined;

    let packageRefs: readonly string[] | undefined;
    let moduleNames: readonly string[] | undefined;
    let entityNames: readonly string[] | undefined;
    let fqnRefs: readonly GrpcQueryTemplateRef[] | undefined;

    for (const conjunct of flattenAndConjuncts(query.predicate)) {
        if (conjunct.kind === "scalar" && conjunct.path.length === 2 && conjunct.path[0] === "templateId") {
            const values = stringValues(conjunct.operator, conjunct.value);

            if (values === undefined) {
                continue;
            } else if (conjunct.path[1] === "packageId") {
                packageRefs ??= values;
            } else if (conjunct.path[1] === "moduleName") {
                moduleNames ??= values;
            } else if (conjunct.path[1] === "entityName") {
                entityNames ??= values;
            }
        } else if (conjunct.kind === "relation" && conjunct.edge === "contractType" && conjunct.quantifier === "one") {
            for (const inner of flattenAndConjuncts(conjunct.predicate)) {
                if (inner.kind !== "scalar" || inner.path.length !== 1) {
                    continue;
                }

                const values = stringValues(inner.operator, inner.value);

                if (values === undefined) {
                    continue;
                } else if (inner.path[0] === "packageName") {
                    packageRefs ??= values.map((name) => `#${name}`);
                } else if (inner.path[0] === "moduleName") {
                    moduleNames ??= values;
                } else if (inner.path[0] === "entityName") {
                    entityNames ??= values;
                } else if (inner.path[0] === "templateFqn") {
                    const triples = values.map(templateRefFromFqn);

                    if (triples.every((triple): triple is GrpcQueryTemplateRef => triple !== undefined)) {
                        fqnRefs ??= triples;
                    }
                }
            }
        }
    }

    const refs = fqnRefs ?? (packageRefs !== undefined && moduleNames !== undefined && entityNames !== undefined
        ? packageRefs.flatMap((packageId) => moduleNames!.flatMap((moduleName) => entityNames!.map((entityName) => ({ packageId, moduleName, entityName }))))
        : undefined);

    return refs !== undefined && refs.length > 0 && refs.length <= MAX_PUSHDOWN_TEMPLATE_FILTERS && refs.every(isValidTemplateRef)
        ? refs
        : undefined;
}

function flattenAndConjuncts(predicate: QueryPredicate | undefined): readonly QueryPredicate[] {
    if (predicate === undefined) {
        return [];
    } else if (predicate.kind === "and") {
        return predicate.children.flatMap(flattenAndConjuncts);
    }

    return [predicate];
}

function templateRefFromFqn(fqn: string): GrpcQueryTemplateRef | undefined {
    const parts = fqn.split(":");

    return parts.length === 3 && parts.every((part) => part.length > 0)
        ? { packageId: `#${parts[0]}`, moduleName: parts[1], entityName: parts[2] }
        : undefined;
}

function isValidTemplateRef(ref: GrpcQueryTemplateRef): boolean {
    const validPackage = ref.packageId.startsWith("#")
        ? /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(ref.packageId.slice(1))
        : /^[0-9a-f]{64}$/.test(ref.packageId);

    if (!validPackage) {
        return false;
    }

    try {
        validDottedNameString(ref.moduleName, "template filter module name");
        validDottedNameString(ref.entityName, "template filter entity name");

        return true;
    } catch {
        return false;
    }
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

    if (target === "contracts") {
        // "every"/"none" must see archived rows too (an archived row can silently violate "every",
        // or an unseen one could exist for "none"); only "some"/"one" ask "does an active row match?",
        // which the active contract set alone already answers completely.
        const provenActiveOnly = (predicate.quantifier === "some" || predicate.quantifier === "one") && predicateProvesActive(predicate.predicate);

        return !provenActiveOnly;
    }

    return target === "transactions" || target === "events" || target === "exercises" || target !== undefined && predicateRequiresHistory(target, predicate.predicate);
}

function includesRequireHistory(relation: QueryRelation, includes: readonly NormalizedInclude[]): boolean {
    return includes.some((include) => {
        if (include.relation === "contracts") {
            return !predicateProvesActive(include.predicate);
        }

        return include.relation === "transactions" || include.relation === "events" || include.relation === "exercises" || predicateRequiresHistory(include.relation, include.predicate) || includesRequireHistory(include.relation, include.includes);
    });
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
        uniqueKeys: { contracts: [["contractId"]], contractTypes: [["pk"]], events: [["pk"]], exercises: [["tpePk", "contractTpePk", "exerciseEventPk", "contractId"]], exerciseTypes: [["pk"]], packages: [["pk"], ["id"]], transactions: [["ix"], ["offset"]], watermark: [["singleton"]] },
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
