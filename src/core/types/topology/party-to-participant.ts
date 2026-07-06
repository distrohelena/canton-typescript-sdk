import { ParticipantPermission } from "./participant-permission.js";
import { TopologySigningKeysWithThreshold } from "./topology-public-key.js";

export class PartyToParticipantOnboarding {
    public constructor(_init: Record<string, never> = {}) {
        void _init;
    }
}

export class PartyToParticipantParticipant {
    public readonly participantUid: string;
    public readonly permission: ParticipantPermission;
    public readonly onboarding?: PartyToParticipantOnboarding;

    public constructor(init: {
        participantUid: string;
        permission?: ParticipantPermission;
        onboarding?: PartyToParticipantOnboarding;
    }) {
        this.participantUid = init.participantUid;
        this.permission = init.permission ?? ParticipantPermission.unspecified;
        this.onboarding = init.onboarding;
    }
}

export class PartyToParticipant {
    public readonly party: string;
    public readonly threshold: number;
    public readonly participants: PartyToParticipantParticipant[];
    public readonly partySigningKeys?: TopologySigningKeysWithThreshold;

    public constructor(init: {
        party: string;
        threshold?: number;
        participants?: PartyToParticipantParticipant[];
        partySigningKeys?: TopologySigningKeysWithThreshold;
    }) {
        this.party = init.party;
        this.threshold = init.threshold ?? 0;
        this.participants = [...(init.participants ?? [])];
        this.partySigningKeys = init.partySigningKeys;
    }
}
