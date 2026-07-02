import { ITransport } from "../../core/transports/iTransport.js";

export class EventsClient {
  public constructor(private readonly transport: ITransport) {
    void this.transport;
  }
}
