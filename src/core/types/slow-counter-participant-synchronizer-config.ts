export class SlowCounterParticipantSynchronizerConfig {
    public readonly synchronizerIds: readonly string[];
    public readonly distinguishedParticipantUids: readonly string[];
    public readonly thresholdDistinguished: string;
    public readonly thresholdDefault: string;
    public readonly participantUidsMetrics: readonly string[];

    public constructor(init: {
        synchronizerIds: readonly string[];
        distinguishedParticipantUids: readonly string[];
        thresholdDistinguished?: string;
        thresholdDefault?: string;
        participantUidsMetrics: readonly string[];
    }) {
        this.synchronizerIds = [...init.synchronizerIds];
        this.distinguishedParticipantUids = [
            ...init.distinguishedParticipantUids,
        ];
        this.thresholdDistinguished = init.thresholdDistinguished ?? "";
        this.thresholdDefault = init.thresholdDefault ?? "";
        this.participantUidsMetrics = [...init.participantUidsMetrics];
    }
}
