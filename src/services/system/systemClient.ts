import { ITransport } from "../../core/transports/iTransport.js";

export class SystemClient {
  public constructor(private readonly transport: ITransport) {
    void this.transport;
  }
}
