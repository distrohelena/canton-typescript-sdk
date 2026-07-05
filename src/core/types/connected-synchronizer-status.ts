import { ConnectedSynchronizerHealth } from "./connected-synchronizer-health.js";

export class ConnectedSynchronizerStatus {
    public readonly physicalSynchronizerId: string;
    public readonly health: ConnectedSynchronizerHealth;

    public constructor(init: {
        physicalSynchronizerId: string;
        health: ConnectedSynchronizerHealth;
    }) {
        this.physicalSynchronizerId = init.physicalSynchronizerId;
        this.health = init.health;
    }
}
