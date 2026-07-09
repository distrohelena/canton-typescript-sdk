import { ValidationError } from "../errors/validation-error.js";

export class SignCommandResult {
    public readonly algorithm: string;
    public readonly signature: Uint8Array;
    public readonly signedBy: string;
    public readonly keyId?: string;

    public constructor(init: {
        algorithm: string;
        signature: Uint8Array;
        signedBy: string;
        keyId?: string;
    }) {
        if (init.signature.length === 0) {
            throw new ValidationError("command signatures require signature bytes");
        }

        else if (!init.signedBy) {
            throw new ValidationError("command signatures require signedBy");
        }

        this.algorithm = init.algorithm;
        this.signature = init.signature;
        this.signedBy = init.signedBy;
        this.keyId = init.keyId;
    }
}
