import { QuerySource } from "./query-source.js";
import {
    ContractCountArgs,
    ContractFindManyArgs,
    ContractFindUniqueArgs,
    ContractRow,
} from "./model-types.js";

export interface FindManyArgs<TWhere, TSelect, TOrderBy> {
    readonly where?: TWhere;
    readonly select?: TSelect;
    readonly orderBy?: TOrderBy;
    readonly skip?: number;
    readonly take?: number;
}

export interface QueryDelegate<TRow, TWhere, TSelect, TOrderBy, TUnique> {
    findMany(args?: FindManyArgs<TWhere, TSelect, TOrderBy>): Promise<readonly TRow[]>;
    findUnique(args: { readonly where: TUnique; readonly select?: TSelect }): Promise<TRow | undefined>;
    count(args?: { readonly where?: TWhere }): Promise<number>;
    aggregate(args: { readonly where?: TWhere; readonly count?: true }): Promise<{ readonly count?: number }>;
}

export interface QueryClient {
    readonly source: QuerySource;
    $queryRaw<TRow>(sql: string, values?: readonly unknown[]): Promise<readonly TRow[]>;
    readonly contracts: {
        findMany(args?: ContractFindManyArgs): Promise<readonly ContractRow[]>;
        findUnique(args: ContractFindUniqueArgs): Promise<ContractRow | undefined>;
        count(args?: ContractCountArgs): Promise<number>;
    };
    readonly contractTypes: PhysicalQueryDelegate;
    readonly events: PhysicalQueryDelegate;
    readonly exercises: PhysicalQueryDelegate;
    readonly exerciseTypes: PhysicalQueryDelegate;
    readonly packages: PhysicalQueryDelegate;
    readonly transactions: PhysicalQueryDelegate;
    readonly watermark: PhysicalQueryDelegate;
}

export interface PhysicalQueryDelegate {
    findMany(): Promise<readonly Record<string, unknown>[]>;
}
