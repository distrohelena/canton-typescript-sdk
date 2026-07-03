export class PartyDetails {
    public readonly party: string;
    public readonly isLocal: boolean;
    public readonly localMetadata?: Record<string, string>;
    public readonly identityProviderId?: string;

    public constructor(init: {
        party: string;
        isLocal: boolean;
        localMetadata?: Record<string, string>;
        identityProviderId?: string;
    }) {
        this.party = init.party;
        this.isLocal = init.isLocal;
        this.localMetadata = init.localMetadata;
        this.identityProviderId = init.identityProviderId;
    }
}
