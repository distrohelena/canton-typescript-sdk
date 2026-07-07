export class GetSynchronizerIdResponse {
    public readonly synchronizerId: string;
    public readonly physicalSynchronizerId: string;

    public constructor(init?: {
        synchronizerId?: string;
        physicalSynchronizerId?: string;
    }) {
        this.synchronizerId = init?.synchronizerId ?? "";
        this.physicalSynchronizerId = init?.physicalSynchronizerId ?? "";
    }
}
