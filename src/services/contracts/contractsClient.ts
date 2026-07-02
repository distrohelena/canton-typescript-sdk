import { ITransport } from "../../core/transports/iTransport.js";

export class ContractsClient {
  public constructor(private readonly transport: ITransport) {
    void this.transport;
  }
}
