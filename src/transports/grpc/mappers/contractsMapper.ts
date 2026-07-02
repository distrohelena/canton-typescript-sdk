import { QueryContractsResponse } from "../../../core/types/responses/queryContractsResponse.js";

export function mapGrpcQueryContracts(payload: {
  contracts?: unknown[];
}): QueryContractsResponse {
  return new QueryContractsResponse({
    contracts: payload.contracts ?? []
  });
}
