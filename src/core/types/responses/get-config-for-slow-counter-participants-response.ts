import { SlowCounterParticipantSynchronizerConfig } from "../slow-counter-participant-synchronizer-config.js";

export class GetConfigForSlowCounterParticipantsResponse {
    public readonly configs: readonly SlowCounterParticipantSynchronizerConfig[];

    public constructor(init: {
        configs: readonly SlowCounterParticipantSynchronizerConfig[];
    }) {
        this.configs = [...init.configs];
    }
}
