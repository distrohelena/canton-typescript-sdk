import { PendingOperationMetadata } from "../pending-operation-metadata.js";

export class ListPendingOperationsResponse {
    public readonly pendingOperations: readonly PendingOperationMetadata[];

    public constructor(init?: {
        pendingOperations?: readonly PendingOperationMetadata[];
    }) {
        this.pendingOperations = init?.pendingOperations ?? [];
    }
}
