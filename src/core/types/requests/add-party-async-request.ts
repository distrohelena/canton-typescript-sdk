import { ParticipantPermission } from "../topology/participant-permission.js";

export class AddPartyAsyncArguments {
    public readonly partyId: string;
    public readonly synchronizerId: string;
    public readonly sourceParticipantUid: string;
    public readonly topologySerial: number;
    public readonly participantPermission: ParticipantPermission;

    public constructor(init: {
        partyId: string;
        synchronizerId: string;
        sourceParticipantUid: string;
        topologySerial: number;
        participantPermission?: ParticipantPermission;
    }) {
        this.partyId = init.partyId;
        this.synchronizerId = init.synchronizerId;
        this.sourceParticipantUid = init.sourceParticipantUid;
        this.topologySerial = init.topologySerial;
        this.participantPermission =
            init.participantPermission ?? ParticipantPermission.unspecified;
    }
}

export class AddPartyAsyncRequest {
    public readonly arguments: AddPartyAsyncArguments;

    public constructor(init: {
        arguments:
            | AddPartyAsyncArguments
            | {
                  partyId: string;
                  synchronizerId: string;
                  sourceParticipantUid: string;
                  topologySerial: number;
                  participantPermission?: ParticipantPermission;
              };
    }) {
        this.arguments =
            init.arguments instanceof AddPartyAsyncArguments
                ? init.arguments
                : new AddPartyAsyncArguments(init.arguments);
    }
}
