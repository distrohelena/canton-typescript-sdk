export class SubmitCommandResponse {
  public readonly commandId?: string;
  public readonly transactionId?: string;

  public constructor(init: {
    commandId?: string;
    transactionId?: string;
  } = {}) {
    this.commandId = init.commandId;
    this.transactionId = init.transactionId;
  }
}
