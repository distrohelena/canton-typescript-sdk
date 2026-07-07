export class GetConnectedSynchronizersRequest {
    public readonly party?: string;
    public readonly participantId?: string;
    public readonly identityProviderId?: string;

    public constructor(init?: {
        party?: string;
        participantId?: string;
        identityProviderId?: string;
    }) {
        this.party = init?.party;
        this.participantId = init?.participantId;
        this.identityProviderId = init?.identityProviderId;
    }
}
