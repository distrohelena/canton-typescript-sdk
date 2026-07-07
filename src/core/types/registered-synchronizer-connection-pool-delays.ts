import { TopologyDuration } from "./topology/topology-duration.js";

export class RegisteredSynchronizerConnectionPoolDelays {
    public readonly minRestartDelay?: TopologyDuration;
    public readonly maxRestartDelay?: TopologyDuration;
    public readonly subscriptionRequestDelay?: TopologyDuration;
    public readonly warnValidationDelay?: TopologyDuration;

    public constructor(init: {
        minRestartDelay?: TopologyDuration;
        maxRestartDelay?: TopologyDuration;
        subscriptionRequestDelay?: TopologyDuration;
        warnValidationDelay?: TopologyDuration;
    } = {}) {
        this.minRestartDelay = init.minRestartDelay;
        this.maxRestartDelay = init.maxRestartDelay;
        this.subscriptionRequestDelay = init.subscriptionRequestDelay;
        this.warnValidationDelay = init.warnValidationDelay;
    }
}
