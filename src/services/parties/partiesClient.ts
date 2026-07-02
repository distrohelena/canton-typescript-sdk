import { ITransport } from "../../core/transports/iTransport.js";
import { CreatePartyRequest } from "../../core/types/requests/createPartyRequest.js";
import { CreatePartyResponse } from "../../core/types/responses/createPartyResponse.js";

export class PartiesClient {
  public constructor(private readonly transport: ITransport) {
    void this.transport;
  }

  public createAsync(request: CreatePartyRequest): Promise<CreatePartyResponse> {
    return this.transport.createPartyAsync(request);
  }
}
