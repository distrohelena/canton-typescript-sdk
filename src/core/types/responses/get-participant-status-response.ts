import { AdminNotInitializedStatus } from "../admin-not-initialized-status.js";
import { ParticipantNodeStatus } from "../participant-node-status.js";

export class GetParticipantStatusResponse {
    public readonly status?: ParticipantNodeStatus;
    public readonly notInitialized?: AdminNotInitializedStatus;

    public constructor(init: {
        status?: ParticipantNodeStatus;
        notInitialized?: AdminNotInitializedStatus;
    }) {
        this.status = init.status;
        this.notInitialized = init.notInitialized;
    }
}
