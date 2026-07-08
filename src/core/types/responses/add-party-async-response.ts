export class AddPartyAsyncResponse {
    public readonly addPartyRequestId: string;

    public constructor(init: {
        addPartyRequestId?: string;
    } = {}) {
        this.addPartyRequestId = init.addPartyRequestId ?? "";
    }
}
