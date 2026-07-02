import { TransportKind } from "../core/types/transportKind.js";

export class CantonClientOptions {
  public readonly transportKind: TransportKind;
  public readonly endpoint: string;

  public constructor(init: { transportKind: TransportKind; endpoint: string }) {
    this.transportKind = init.transportKind;
    this.endpoint = init.endpoint;
  }
}
