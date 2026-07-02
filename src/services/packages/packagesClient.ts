import { ITransport } from "../../core/transports/iTransport.js";

export class PackagesClient {
  public constructor(private readonly transport: ITransport) {
    void this.transport;
  }
}
