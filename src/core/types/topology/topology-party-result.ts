import { ParticipantPermission } from "./participant-permission.js";

export class TopologyPartyParticipantSynchronizerPermission {
    public readonly synchronizerId: string;
    public readonly permission: ParticipantPermission;
    public readonly physicalSynchronizerId: string;

    public constructor(init: {
        synchronizerId: string;
        permission?: ParticipantPermission;
        physicalSynchronizerId?: string;
    }) {
        this.synchronizerId = init.synchronizerId;
        this.permission = init.permission ?? ParticipantPermission.unspecified;
        this.physicalSynchronizerId = init.physicalSynchronizerId ?? "";
    }
}

export class TopologyPartyParticipant {
    public readonly participantUid: string;
    public readonly synchronizers: TopologyPartyParticipantSynchronizerPermission[];

    public constructor(init: {
        participantUid: string;
        synchronizers?: TopologyPartyParticipantSynchronizerPermission[];
    }) {
        this.participantUid = init.participantUid;
        this.synchronizers = [...(init.synchronizers ?? [])];
    }
}

export class TopologyPartyResult {
    public readonly party: string;
    public readonly participants: TopologyPartyParticipant[];

    public constructor(init: {
        party: string;
        participants?: TopologyPartyParticipant[];
    }) {
        this.party = init.party;
        this.participants = [...(init.participants ?? [])];
    }
}
