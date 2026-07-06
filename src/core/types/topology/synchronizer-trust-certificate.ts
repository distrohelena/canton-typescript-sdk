export class SynchronizerTrustCertificate {
    public readonly participantUid: string;
    public readonly synchronizerId: string;
    public readonly featureFlags: string[];

    public constructor(init: {
        participantUid: string;
        synchronizerId: string;
        featureFlags?: string[];
    }) {
        this.participantUid = init.participantUid;
        this.synchronizerId = init.synchronizerId;
        this.featureFlags = [...(init.featureFlags ?? [])];
    }
}
