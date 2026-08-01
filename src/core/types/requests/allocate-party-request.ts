export class AllocatePartyRequest {
    public readonly partyIdHint?: string;
    public readonly displayName?: string;
    public readonly userId?: string;

    public constructor(
        init: {
            partyIdHint?: string;
            displayName?: string;
            userId?: string;
        } = {},
    ) {
        this.partyIdHint = init.partyIdHint;
        this.displayName = init.displayName;
        this.userId = init.userId;
    }
}
