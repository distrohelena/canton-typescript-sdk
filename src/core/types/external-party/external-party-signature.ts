import { ExternalPartySignatureFormat } from "./external-party-signature-format.js";
import { ExternalPartySigningAlgorithmSpec } from "./external-party-signing-algorithm-spec.js";

export class ExternalPartySignature {
    public readonly format: ExternalPartySignatureFormat;
    public readonly signature: Uint8Array;
    public readonly signedByFingerprint: string;
    public readonly signingAlgorithmSpec: ExternalPartySigningAlgorithmSpec;

    public constructor(
        init: {
            format?: ExternalPartySignatureFormat;
            signature?: Uint8Array;
            signedByFingerprint?: string;
            signingAlgorithmSpec?: ExternalPartySigningAlgorithmSpec;
        } = {},
    ) {
        this.format = init.format ?? ExternalPartySignatureFormat.unspecified;
        this.signature = new Uint8Array(init.signature ?? []);
        this.signedByFingerprint = init.signedByFingerprint ?? "";
        this.signingAlgorithmSpec =
            init.signingAlgorithmSpec
            ?? ExternalPartySigningAlgorithmSpec.unspecified;
    }
}
