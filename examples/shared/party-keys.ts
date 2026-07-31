import { generateKeyPairSync, sign } from "node:crypto";
import {
    ExternalPartyCryptoKeyFormat,
    ExternalPartySignatureFormat,
    ExternalPartySigningAlgorithmSpec,
    ExternalPartySigningKeySpec,
    ExternalPartySigningPublicKey,
    type ExternalPartySigningResult,
} from "@distrohelena/canton-typescript-sdk";

export interface ExampleEd25519Key {
    readonly publicKey: ExternalPartySigningPublicKey;
    readonly sign: (
        request: { readonly payload: Uint8Array },
    ) => Promise<ExternalPartySigningResult>;
}

export function createExampleEd25519Key(): ExampleEd25519Key {
    const keyPair = generateKeyPairSync("ed25519");

    return {
        publicKey: new ExternalPartySigningPublicKey({
            format: ExternalPartyCryptoKeyFormat.derX509SubjectPublicKeyInfo,
            keyData: new Uint8Array(
                keyPair.publicKey.export({ format: "der", type: "spki" }),
            ),
            keySpec: ExternalPartySigningKeySpec.ecCurve25519,
        }),
        sign: async request => ({
            format: ExternalPartySignatureFormat.concat,
            signature: new Uint8Array(sign(null, request.payload, keyPair.privateKey)),
            signingAlgorithmSpec: ExternalPartySigningAlgorithmSpec.ed25519,
        }),
    };
}
