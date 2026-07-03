export class SignCommandRequest {
    public readonly payload: Uint8Array;
    public readonly keyId?: string;

    public constructor(init: { payload: Uint8Array; keyId?: string }) {
        this.payload = init.payload;
        this.keyId = init.keyId;
    }
}
