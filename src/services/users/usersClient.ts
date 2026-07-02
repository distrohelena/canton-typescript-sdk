import { ITransport } from "../../core/transports/iTransport.js";

export class UsersClient {
  public constructor(private readonly transport: ITransport) {
    void this.transport;
  }
}
