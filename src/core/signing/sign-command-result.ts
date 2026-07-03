export class SignCommandResult {
    public readonly algorithm: string;
    public readonly signature: Uint8Array;
    public readonly keyId?: string;

    public constructor(init: {
        algorithm: string;
        signature: Uint8Array;
        keyId?: string;
    }) {
        this.algorithm = init.algorithm;
        this.signature = init.signature;
        this.keyId = init.keyId;
    }
}
