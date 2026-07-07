export class ListPendingOperationsRequest {
    public readonly operationName?: string;
    public readonly filterSynchronizerId?: string;
    public readonly filterPhysicalSynchronizerId?: string;
    public readonly filterOperationKey?: string;

    public constructor(init?: {
        operationName?: string;
        filterSynchronizerId?: string;
        filterPhysicalSynchronizerId?: string;
        filterOperationKey?: string;
    }) {
        this.operationName = init?.operationName;
        this.filterSynchronizerId = init?.filterSynchronizerId;
        this.filterPhysicalSynchronizerId = init?.filterPhysicalSynchronizerId;
        this.filterOperationKey = init?.filterOperationKey;
    }
}
