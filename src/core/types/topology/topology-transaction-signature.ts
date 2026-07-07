import { TopologySignatureDelegation } from "./topology-signature-delegation.js";

export class TopologyTransactionSignature {
    public readonly format?: string;
    public readonly signature: Uint8Array;
    public readonly signedByFingerprint: string;
    public readonly signingAlgorithmSpec?: string;
    public readonly signatureDelegation?: TopologySignatureDelegation;

    public constructor(init: {
        format?: string;
        signature?: Uint8Array;
        signedByFingerprint?: string;
        signingAlgorithmSpec?: string;
        signatureDelegation?: TopologySignatureDelegation;
    } = {}) {
        this.format = init.format;
        this.signature = new Uint8Array(init.signature ?? []);
        this.signedByFingerprint = init.signedByFingerprint ?? "";
        this.signingAlgorithmSpec = init.signingAlgorithmSpec;
        this.signatureDelegation = init.signatureDelegation;
    }
}
