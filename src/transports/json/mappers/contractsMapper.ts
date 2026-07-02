import { QueryContractsResponse } from "../../../core/types/responses/queryContractsResponse.js";

export function mapJsonQueryContracts(payload: {
  result?: unknown[];
}): QueryContractsResponse {
  return new QueryContractsResponse({
    contracts: payload.result ?? []
  });
}
