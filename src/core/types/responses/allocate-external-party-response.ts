export class AllocateExternalPartyResponse {
    public readonly partyId: string;

    public constructor(init: { partyId?: string } = {}) {
        this.partyId = init.partyId ?? "";
    }
}
