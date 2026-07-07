import { RegisteredSynchronizerTimeProofRequestConfig } from "./registered-synchronizer-time-proof-request-config.js";
import { TopologyDuration } from "./topology/topology-duration.js";

export class RegisteredSynchronizerTimeTrackerConfig {
    public readonly observationLatency?: TopologyDuration;
    public readonly patienceDuration?: TopologyDuration;
    public readonly minObservationDuration?: TopologyDuration;
    public readonly timeProofRequest?: RegisteredSynchronizerTimeProofRequestConfig;

    public constructor(init: {
        observationLatency?: TopologyDuration;
        patienceDuration?: TopologyDuration;
        minObservationDuration?: TopologyDuration;
        timeProofRequest?: RegisteredSynchronizerTimeProofRequestConfig;
    } = {}) {
        this.observationLatency = init.observationLatency;
        this.patienceDuration = init.patienceDuration;
        this.minObservationDuration = init.minObservationDuration;
        this.timeProofRequest = init.timeProofRequest;
    }
}
