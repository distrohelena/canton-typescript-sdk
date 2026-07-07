export class ContractArchived<TArchivedEvent = unknown> {
    public readonly archivedEvent?: TArchivedEvent;
    public readonly synchronizerId: string;

    public constructor(init: {
        archivedEvent?: TArchivedEvent;
        synchronizerId?: string;
    }) {
        this.archivedEvent = init.archivedEvent;
        this.synchronizerId = init.synchronizerId ?? "";
    }
}
