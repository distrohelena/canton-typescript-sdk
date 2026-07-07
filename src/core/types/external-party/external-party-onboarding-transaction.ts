import { ExternalPartySignature } from "./external-party-signature.js";

export class ExternalPartyOnboardingTransaction {
    public readonly transaction: Uint8Array;
    public readonly signatures: ExternalPartySignature[];

    public constructor(
        init: {
            transaction?: Uint8Array;
            signatures?: ExternalPartySignature[];
        } = {},
    ) {
        this.transaction = new Uint8Array(init.transaction ?? []);
        this.signatures = [...(init.signatures ?? [])];
    }
}
