import { TopologyDuration } from "./topology/topology-duration.js";

export class RegisteredSynchronizerSubscriptionLivenessLimits {
    public readonly maxTimestampDelta?: TopologyDuration;
    public readonly maxOrdinalDelta: number;

    public constructor(init: {
        maxTimestampDelta?: TopologyDuration;
        maxOrdinalDelta?: number;
    } = {}) {
        this.maxTimestampDelta = init.maxTimestampDelta;
        this.maxOrdinalDelta = init.maxOrdinalDelta ?? 0;
    }
}
