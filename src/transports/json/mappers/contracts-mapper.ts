import { QueryContractsResponse } from "../../../core/types/responses/query-contracts-response.js";

export function mapJsonQueryContracts(payload: {
    result?: unknown[];
}): QueryContractsResponse {
    return new QueryContractsResponse({
        contracts: payload.result ?? [],
    });
}
