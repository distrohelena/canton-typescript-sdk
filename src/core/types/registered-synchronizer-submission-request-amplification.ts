import { TopologyDuration } from "./topology/topology-duration.js";

export class RegisteredSynchronizerSubmissionRequestAmplification {
    public readonly factor: number;
    public readonly patience?: TopologyDuration;
    public readonly confirmationResponseFactor?: number;
    public readonly confirmationResponsePatience?: TopologyDuration;

    public constructor(init: {
        factor?: number;
        patience?: TopologyDuration;
        confirmationResponseFactor?: number;
        confirmationResponsePatience?: TopologyDuration;
    } = {}) {
        this.factor = init.factor ?? 0;
        this.patience = init.patience;
        this.confirmationResponseFactor = init.confirmationResponseFactor;
        this.confirmationResponsePatience = init.confirmationResponsePatience;
    }
}
