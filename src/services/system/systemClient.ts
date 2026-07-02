import { ITransport } from "../../core/transports/iTransport.js";
import { HealthStatusResponse } from "../../core/types/responses/healthStatusResponse.js";

export class SystemClient {
  public constructor(private readonly transport: ITransport) {
    void this.transport;
  }

  public getHealthAsync(): Promise<HealthStatusResponse> {
    return this.transport.getHealthAsync();
  }
}
