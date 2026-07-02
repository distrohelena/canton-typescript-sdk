export class StreamTransactionsRequest {
  public readonly beginOffset?: string;

  public constructor(init: { beginOffset?: string } = {}) {
    this.beginOffset = init.beginOffset;
  }
}
