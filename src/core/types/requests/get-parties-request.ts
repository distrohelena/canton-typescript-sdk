export class GetPartiesRequest {
    public readonly parties: readonly string[];
    public readonly identityProviderId?: string;

    public constructor(init: {
        parties: readonly string[];
        identityProviderId?: string;
    }) {
        this.parties = init.parties;
        this.identityProviderId = init.identityProviderId;
    }
}
