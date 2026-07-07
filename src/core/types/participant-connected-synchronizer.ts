export class ParticipantConnectedSynchronizer {
    public readonly synchronizerAlias: string;
    public readonly synchronizerId: string;
    public readonly physicalSynchronizerId: string;
    public readonly healthy: boolean;

    public constructor(init: {
        synchronizerAlias: string;
        synchronizerId: string;
        physicalSynchronizerId: string;
        healthy: boolean;
    }) {
        this.synchronizerAlias = init.synchronizerAlias;
        this.synchronizerId = init.synchronizerId;
        this.physicalSynchronizerId = init.physicalSynchronizerId;
        this.healthy = init.healthy;
    }
}
