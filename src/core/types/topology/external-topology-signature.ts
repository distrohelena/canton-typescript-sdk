import { TopologySignatureDelegation } from "./topology-signature-delegation.js";
import { TopologySignatureFormat } from "./topology-signature-format.js";

export class ExternalTopologySignature {
    public readonly transactionHash: Uint8Array;
    public readonly signature: Uint8Array;
    public readonly signedByFingerprint: string;
    public readonly signatureFormat?: TopologySignatureFormat;
    public readonly signingAlgorithmSpec?: string;
    public readonly signatureDelegation?: TopologySignatureDelegation;

    public constructor(init: {
        transactionHash?: Uint8Array;
        signature?: Uint8Array;
        signedByFingerprint?: string;
        signatureFormat?: TopologySignatureFormat;
        signingAlgorithmSpec?: string;
        signatureDelegation?: TopologySignatureDelegation;
    } = {}) {
        this.transactionHash = new Uint8Array(init.transactionHash ?? []);
        this.signature = new Uint8Array(init.signature ?? []);
        this.signedByFingerprint = init.signedByFingerprint ?? "";
        this.signatureFormat = init.signatureFormat;
        this.signingAlgorithmSpec = init.signingAlgorithmSpec;
        this.signatureDelegation = init.signatureDelegation;
    }
}
