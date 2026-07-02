import { ITransport } from "../../core/transports/iTransport.js";

export class PartiesClient {
  public constructor(private readonly transport: ITransport) {
    void this.transport;
  }
}
