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
import {
    mapGrpcAllocateExternalPartyRequest,
    mapGrpcAllocateExternalPartyResponse,
    mapGrpcGenerateExternalPartyTopologyRequest,
    mapGrpcGenerateExternalPartyTopologyResponse,
} from "../../../src/transports/grpc/mappers/external-party-management-mapper.js";

describe("gRPC external-party management mappers", () => {
    it("maps generate-external-party-topology requests", () => {
        const result = mapGrpcGenerateExternalPartyTopologyRequest(
            new GenerateExternalPartyTopologyRequest({
                synchronizer: "sync::1",
                partyHint: "ed25519_party",
                publicKey: new ExternalPartySigningPublicKey({
                    format: ExternalPartyCryptoKeyFormat.raw,
                    keyData: new Uint8Array([1, 2, 3]),
                    keySpec: ExternalPartySigningKeySpec.ecCurve25519,
                }),
                localParticipantObservationOnly: true,
                otherConfirmingParticipantUids: ["participant1::sandbox"],
                confirmationThreshold: 2,
                observingParticipantUids: ["participant2::sandbox"],
            }),
        );

        expect(result.partyHint).toBe("ed25519_party");
        expect(result.publicKey?.format).toBe(2);
        expect(result.publicKey?.keyData).toEqual(new Uint8Array([1, 2, 3]));
        expect(result.publicKey?.keySpec).toBe(1);
        expect(result.localParticipantObservationOnly).toBe(true);
        expect(result.otherConfirmingParticipantUids).toEqual([
            "participant1::sandbox",
        ]);
        expect(result.confirmationThreshold).toBe(2);
        expect(result.observingParticipantUids).toEqual([
            "participant2::sandbox",
        ]);
    });

    it("maps allocate-external-party requests and responses", () => {
        const request = mapGrpcAllocateExternalPartyRequest(
            new AllocateExternalPartyRequest({
                synchronizer: "sync::1",
                onboardingTransactions: [
                    new ExternalPartyOnboardingTransaction({
                        transaction: new Uint8Array([4, 5, 6]),
                        signatures: [
                            new ExternalPartySignature({
                                format: ExternalPartySignatureFormat.concat,
                                signature: new Uint8Array([7, 8, 9]),
                                signedByFingerprint: "fingerprint::1",
                                signingAlgorithmSpec:
                                    ExternalPartySigningAlgorithmSpec.ed25519,
                            }),
                        ],
                    }),
                ],
                multiHashSignatures: [
                    new ExternalPartySignature({
                        format: ExternalPartySignatureFormat.concat,
                        signature: new Uint8Array([10, 11, 12]),
                        signedByFingerprint: "fingerprint::2",
                        signingAlgorithmSpec:
                            ExternalPartySigningAlgorithmSpec.ed25519,
                    }),
                ],
                identityProviderId: "default",
                waitForAllocation: true,
                userId: "wallet-user",
            }),
        );

        const response = mapGrpcAllocateExternalPartyResponse({
            partyId: "ed25519_party::fingerprint",
        });

        expect(request.synchronizer).toBe("sync::1");
        expect(request.onboardingTransactions).toHaveLength(1);
        expect(request.onboardingTransactions[0].transaction).toEqual(
            new Uint8Array([4, 5, 6]),
        );
        expect(request.onboardingTransactions[0].signatures[0].format).toBe(3);
        expect(request.onboardingTransactions[0].signatures[0].signedBy).toBe(
            "fingerprint::1",
        );
        expect(request.multiHashSignatures[0].format).toBe(3);
        expect(request.multiHashSignatures[0].signedBy).toBe("fingerprint::2");
        expect(request.identityProviderId).toBe("default");
        expect(request.waitForAllocation).toBe(true);
        expect(request.userId).toBe("wallet-user");
        expect(response.partyId).toBe("ed25519_party::fingerprint");
    });

    it("maps generate-external-party-topology responses", () => {
        const response = mapGrpcGenerateExternalPartyTopologyResponse({
            partyId: "ed25519_party::fingerprint",
            publicKeyFingerprint: "fingerprint",
            topologyTransactions: [
                new Uint8Array([1, 2, 3]),
                new Uint8Array([4, 5, 6]),
            ],
            multiHash: new Uint8Array([7, 8, 9]),
        });

        expect(response.partyId).toBe("ed25519_party::fingerprint");
        expect(response.publicKeyFingerprint).toBe("fingerprint");
        expect(response.topologyTransactions).toEqual([
            new Uint8Array([1, 2, 3]),
            new Uint8Array([4, 5, 6]),
        ]);
        expect(response.multiHash).toEqual(new Uint8Array([7, 8, 9]));
    });
});
