export class CreatePartyResponse {
  public readonly party: string;

  public constructor(init: { party: string }) {
    this.party = init.party;
  }
}
