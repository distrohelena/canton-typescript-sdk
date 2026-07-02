export class CreatePartyRequest {
  public readonly partyIdHint?: string;
  public readonly displayName?: string;

  public constructor(init: {
    partyIdHint?: string;
    displayName?: string;
  } = {}) {
    this.partyIdHint = init.partyIdHint;
    this.displayName = init.displayName;
  }
}
