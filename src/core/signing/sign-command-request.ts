export class SignCommandRequest {
    public readonly payload: Uint8Array;
    public readonly keyId?: string;
    public readonly party?: string;
    public readonly algorithmHint?: string;

    public constructor(
        init: {
            payload: Uint8Array;
            keyId?: string;
            party?: string;
            algorithmHint?: string;
        },
    ) {
        this.payload = init.payload;
        this.keyId = init.keyId;
        this.party = init.party;
        this.algorithmHint = init.algorithmHint;
    }
}
