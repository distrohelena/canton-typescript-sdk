import { ConnectedSynchronizer } from "../connected-synchronizer.js";

export class GetConnectedSynchronizersResponse {
    public readonly connectedSynchronizers: readonly ConnectedSynchronizer[];

    public constructor(init: {
        connectedSynchronizers: readonly ConnectedSynchronizer[];
    }) {
        this.connectedSynchronizers = init.connectedSynchronizers;
    }
}
