export class CountInFlightRequest {
    public readonly synchronizerId: string;

    public constructor(init: {
        synchronizerId: string;
    }) {
        this.synchronizerId = init.synchronizerId;
    }
}
