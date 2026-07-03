import { QueryContractsResponse } from "../../../core/types/responses/query-contracts-response.js";

export function mapGrpcQueryContracts(payload: {
    contracts?: unknown[];
}): QueryContractsResponse {
    return new QueryContractsResponse({
        contracts: payload.contracts ?? [],
    });
}
