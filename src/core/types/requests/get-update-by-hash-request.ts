export class GetUpdateByHashRequest {
    public readonly transactionHash: Uint8Array;
    public readonly updateFormat?: Record<string, unknown>;

    public constructor(init: {
        transactionHash: Uint8Array;
        updateFormat?: Record<string, unknown>;
    }) {
        this.transactionHash = init.transactionHash;
        this.updateFormat = init.updateFormat;
    }
}
