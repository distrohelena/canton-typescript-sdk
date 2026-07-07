export class GetUpdateByIdRequest {
    public readonly updateId: string;
    public readonly updateFormat?: Record<string, unknown>;

    public constructor(init: {
        updateId: string;
        updateFormat?: Record<string, unknown>;
    }) {
        this.updateId = init.updateId;
        this.updateFormat = init.updateFormat;
    }
}
