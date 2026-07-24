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
}
