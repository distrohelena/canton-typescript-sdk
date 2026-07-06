import { ParticipantPermission } from "./participant-permission.js";

export class ParticipantSynchronizerLimits {
    public readonly confirmationRequestsMaxRate: number;

    public constructor(init: {
        confirmationRequestsMaxRate?: number;
    } = {}) {
        this.confirmationRequestsMaxRate =
            init.confirmationRequestsMaxRate ?? 0;
    }
}

export class ParticipantSynchronizerPermission {
    public readonly synchronizerId: string;
    public readonly participantUid: string;
    public readonly permission: ParticipantPermission;
    public readonly limits?: ParticipantSynchronizerLimits;
    public readonly loginAfter?: string;

    public constructor(init: {
        synchronizerId: string;
        participantUid: string;
        permission?: ParticipantPermission;
        limits?: ParticipantSynchronizerLimits;
        loginAfter?: string;
    }) {
        this.synchronizerId = init.synchronizerId;
        this.participantUid = init.participantUid;
        this.permission = init.permission ?? ParticipantPermission.unspecified;
        this.limits = init.limits;
        this.loginAfter = init.loginAfter;
    }
}
