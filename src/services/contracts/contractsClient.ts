import { ITransport } from "../../core/transports/iTransport.js";
import { QueryContractsRequest } from "../../core/types/requests/queryContractsRequest.js";
import { QueryContractsResponse } from "../../core/types/responses/queryContractsResponse.js";

export class ContractsClient {
  public constructor(private readonly transport: ITransport) {
    void this.transport;
  }

  public queryAsync(request: QueryContractsRequest): Promise<QueryContractsResponse> {
    return this.transport.queryContractsAsync(request);
  }
}
