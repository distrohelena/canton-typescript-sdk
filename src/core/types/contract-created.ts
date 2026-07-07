export class ContractCreated<TCreatedEvent = unknown> {
    public readonly createdEvent?: TCreatedEvent;
    public readonly synchronizerId: string;

    public constructor(init: {
        createdEvent?: TCreatedEvent;
        synchronizerId?: string;
    }) {
        this.createdEvent = init.createdEvent;
        this.synchronizerId = init.synchronizerId ?? "";
    }
}
