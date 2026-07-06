export class PartyHostingLimits {
    public readonly synchronizerId: string;
    public readonly party: string;

    public constructor(init: {
        synchronizerId: string;
        party: string;
    }) {
        this.synchronizerId = init.synchronizerId;
        this.party = init.party;
    }
}
