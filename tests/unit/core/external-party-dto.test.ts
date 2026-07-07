import { describe, expect, it } from "vitest";
import {
    AllocateExternalPartyRequest,
    ExternalPartyCryptoKeyFormat,
    ExternalPartyOnboardingTransaction,
    ExternalPartySignature,
    ExternalPartySignatureFormat,
    ExternalPartySigningAlgorithmSpec,
    ExternalPartySigningKeySpec,
    ExternalPartySigningPublicKey,
    GenerateExternalPartyTopologyRequest,
} from "../../../src";

describe("external party dto core", () => {
    it("constructs external-party request and signature models", () => {
        const request = new GenerateExternalPartyTopologyRequest({
            synchronizer: "sync::1",
            partyHint: "ed25519_party",
            publicKey: new ExternalPartySigningPublicKey({
                format: ExternalPartyCryptoKeyFormat.raw,
                keyData: new Uint8Array([1, 2, 3]),
                keySpec: ExternalPartySigningKeySpec.ecCurve25519,
            }),
        });

        const signature = new ExternalPartySignature({
            format: ExternalPartySignatureFormat.concat,
            signature: new Uint8Array([4, 5, 6]),
            signedByFingerprint: "fingerprint::1",
            signingAlgorithmSpec: ExternalPartySigningAlgorithmSpec.ed25519,
        });

        const allocateRequest = new AllocateExternalPartyRequest({
            synchronizer: "sync::1",
            onboardingTransactions: [
                new ExternalPartyOnboardingTransaction({
                    transaction: new Uint8Array([7, 8, 9]),
                    signatures: [signature],
                }),
            ],
            multiHashSignatures: [signature],
            waitForAllocation: true,
        });

        expect(request.partyHint).toBe("ed25519_party");
        expect(request.publicKey.keyData).toEqual(new Uint8Array([1, 2, 3]));
        expect(signature.signingAlgorithmSpec).toBe(
            ExternalPartySigningAlgorithmSpec.ed25519,
        );
        expect(allocateRequest.onboardingTransactions).toHaveLength(1);
        expect(allocateRequest.multiHashSignatures).toHaveLength(1);
        expect(allocateRequest.waitForAllocation).toBe(true);
    });
});
