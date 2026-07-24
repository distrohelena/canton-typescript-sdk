import { QuerySource } from "./query-source.js";
import {
    ContractCountArgs,
    ContractFindManyArgs,
    ContractFindUniqueArgs,
    ContractRow,
} from "./model-types.js";

export interface QueryClient {
    readonly source: QuerySource;
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
