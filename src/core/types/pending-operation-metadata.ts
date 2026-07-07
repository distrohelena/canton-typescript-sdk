export class PendingOperationMetadata {
    public readonly operationName: string;
    public readonly operationKey: string;
    public readonly synchronizerId?: string;
    public readonly physicalSynchronizerId?: string;

    public constructor(init: {
        operationName: string;
        operationKey: string;
        synchronizerId?: string;
        physicalSynchronizerId?: string;
    }) {
        this.operationName = init.operationName;
        this.operationKey = init.operationKey;
        this.synchronizerId = init.synchronizerId;
        this.physicalSynchronizerId = init.physicalSynchronizerId;
    }
}
