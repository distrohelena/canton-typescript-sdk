export class GetParticipantIdResponse {
    public readonly participantId: string;

    public constructor(init: { participantId: string }) {
        this.participantId = init.participantId;
    }
}
