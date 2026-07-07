export class InspectCommitmentContractsRequest {
    public readonly cids: readonly Uint8Array[];
    public readonly expectedSynchronizerId: string;
    public readonly timestamp?: Date;
    public readonly downloadPayload: boolean;

    public constructor(init: {
        cids?: readonly Uint8Array[];
        expectedSynchronizerId: string;
        timestamp?: Date;
        downloadPayload?: boolean;
    }) {
        this.cids = (init.cids ?? []).map((item) => new Uint8Array(item));
        this.expectedSynchronizerId = init.expectedSynchronizerId;
        this.timestamp = init.timestamp;
        this.downloadPayload = init.downloadPayload ?? false;
    }
}
