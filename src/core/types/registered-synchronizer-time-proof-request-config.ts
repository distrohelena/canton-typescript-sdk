import { TopologyDuration } from "./topology/topology-duration.js";

export class RegisteredSynchronizerTimeProofRequestConfig {
    public readonly initialRetryDelay?: TopologyDuration;
    public readonly maxRetryDelay?: TopologyDuration;
    public readonly maxSequencingDelay?: TopologyDuration;

    public constructor(init: {
        initialRetryDelay?: TopologyDuration;
        maxRetryDelay?: TopologyDuration;
        maxSequencingDelay?: TopologyDuration;
    } = {}) {
        this.initialRetryDelay = init.initialRetryDelay;
        this.maxRetryDelay = init.maxRetryDelay;
        this.maxSequencingDelay = init.maxSequencingDelay;
    }
}
