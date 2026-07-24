import { QuerySource } from "./query-source.js";

export interface QueryClient {
    readonly source: QuerySource;
}
