import { ParticipantConnectedSynchronizer } from "../participant-connected-synchronizer.js";

export class ListConnectedSynchronizersResponse {
    public readonly connectedSynchronizers: readonly ParticipantConnectedSynchronizer[];

    public constructor(init: {
        connectedSynchronizers: readonly ParticipantConnectedSynchronizer[];
    }) {
        this.connectedSynchronizers = [...init.connectedSynchronizers];
    }
}
