import { RegisteredSynchronizerConnectionConfig } from "./registered-synchronizer-connection-config.js";
import { RegisteredSynchronizerPredecessor } from "./registered-synchronizer-predecessor.js";
import { RegisteredSynchronizerStatus } from "./registered-synchronizer-status.js";

export class RegisteredSynchronizer {
    public readonly config?: RegisteredSynchronizerConnectionConfig;
    public readonly connected: boolean;
    public readonly physicalSynchronizerId?: string;
    public readonly status: RegisteredSynchronizerStatus;
    public readonly synchronizerPredecessor?: RegisteredSynchronizerPredecessor;

    public constructor(init: {
        config?: RegisteredSynchronizerConnectionConfig;
        connected?: boolean;
        physicalSynchronizerId?: string;
        status: RegisteredSynchronizerStatus;
        synchronizerPredecessor?: RegisteredSynchronizerPredecessor;
    }) {
        this.config = init.config;
        this.connected = init.connected ?? false;
        this.physicalSynchronizerId = init.physicalSynchronizerId;
        this.status = init.status;
        this.synchronizerPredecessor = init.synchronizerPredecessor;
    }
}
