export class ListRegisteredSynchronizersRequest {
    public readonly allStatuses: boolean;

    public constructor(init: {
        allStatuses?: boolean;
    } = {}) {
        this.allStatuses = init.allStatuses ?? false;
    }
}
