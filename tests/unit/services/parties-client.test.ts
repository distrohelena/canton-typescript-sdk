import { describe, expect, it, vi } from "vitest";
import {
    AllocateExternalPartyRequest,
    AllocateExternalPartyResponse,
    CreateExternalPartyRequest,
    CreateDecentralizedPartyRequest,
    PreparedDecentralizedParty,
    GenerateTopologyTransactionsResponse,
    GeneratedTopologyTransaction,
    ExternalPartyOnboardingTransaction,
    ExternalPartySignature,
    ExternalPartySignatureFormat,
    ExternalPartySigningAlgorithmSpec,
    ExternalPartySigningPublicKey,
    ExternalPartyCryptoKeyFormat,
    ExternalPartySigningKeySpec,
    GenerateExternalPartyTopologyRequest,
    GenerateExternalPartyTopologyResponse,
    GetParticipantIdRequest,
    GetParticipantIdResponse,
    GetPartiesRequest,
    GetPartiesResponse,
    ListKnownPartiesRequest,
    ListKnownPartiesResponse,
    PartyDetails,
    RequestOptions,
} from "../../../src";
import { PartyManagementServiceClient } from "../../../src/services/party-management/party-management-service-client.js";

describe("PartyManagementServiceClient", () => {
    it("lists parties through the selected transport", async () => {
        const getParticipantIdAsync = vi.fn(
            async () =>
                new GetParticipantIdResponse({
                    participantId: "participant::sandbox",
                }),
        );

        const getPartiesAsync = vi.fn(
            async () =>
                new GetPartiesResponse({
                    partyDetails: [],
                }),
        );

        const listKnownPartiesAsync = vi.fn(
            async () =>
                new ListKnownPartiesResponse({
                    partyDetails: [
                        new PartyDetails({
                            party: "Alice",
                            isLocal: true,
                        }),
                    ],
                }),
        );

        const generateExternalPartyTopologyAsync = vi.fn(
            async () =>
                new GenerateExternalPartyTopologyResponse({
                    partyId: "ed25519_party::fingerprint",
                    publicKeyFingerprint: "fingerprint",
                    topologyTransactions: [new Uint8Array([1, 2, 3])],
                    multiHash: new Uint8Array([4, 5, 6]),
                }),
        );

        const allocateExternalPartyAsync = vi.fn(
            async () =>
                new AllocateExternalPartyResponse({
                    partyId: "ed25519_party::fingerprint",
                }),
        );

        const transport = {
            features: { supportsCommandSigning: false },
            getLedgerApiVersionAsync: async () => {
                throw new Error("not used");
            },
            getParticipantIdAsync,
            getPartiesAsync,
            allocatePartyAsync: async () => {
                throw new Error("not used");
            },
            generateExternalPartyTopologyAsync,
            allocateExternalPartyAsync,
            listKnownPartiesAsync,
            grantUserRightsAsync: async () => {
                throw new Error("not used");
            },
            uploadDarFileAsync: async () => {
                throw new Error("not used");
            },
            getActiveContractsPageAsync: async () => {
                throw new Error("not used");
            },
            getActiveContractsAsync: async () => {
                throw new Error("not used");
            },
            getUpdatesAsync: async () => {
                throw new Error("not used");
            },
            submitCommandAsync: async () => {
                throw new Error("not used");
            },
        };

        const client = new PartyManagementServiceClient(transport);

        await expect(
            client.listKnownPartiesAsync(
                new ListKnownPartiesRequest({ filterParty: "Alice" }),
            ),
        ).resolves.toMatchObject({
            partyDetails: [{ party: "Alice" }],
        });

        const options = new RequestOptions({
            timeoutMs: 5_000,
        });

        const request = new ListKnownPartiesRequest({
            filterParty: "Alice",
        });

        const externalPartyRequest = new GenerateExternalPartyTopologyRequest({
            synchronizer: "sync::sandbox",
            partyHint: "ed25519_party",
            publicKey: new ExternalPartySigningPublicKey({
                format: ExternalPartyCryptoKeyFormat.raw,
                keyData: new Uint8Array([1, 2, 3]),
                keySpec: ExternalPartySigningKeySpec.ecCurve25519,
            }),
        });

        const allocateExternalRequest = new AllocateExternalPartyRequest({
            synchronizer: "sync::sandbox",
            onboardingTransactions: [
                new ExternalPartyOnboardingTransaction({
                    transaction: new Uint8Array([7, 8, 9]),
                    signatures: [
                        new ExternalPartySignature({
                            format: ExternalPartySignatureFormat.concat,
                            signature: new Uint8Array([10, 11, 12]),
                            signedByFingerprint: "fingerprint",
                            signingAlgorithmSpec:
                                ExternalPartySigningAlgorithmSpec.ed25519,
                        }),
                    ],
                }),
            ],
        });

        await client.listKnownPartiesAsync(request, options);
        await expect(
            client.getParticipantIdAsync(
                new GetParticipantIdRequest(),
                options,
            ),
        ).resolves.toBeInstanceOf(GetParticipantIdResponse);
        await expect(
            client.getPartiesAsync(
                new GetPartiesRequest({
                    parties: ["Alice"],
                }),
                options,
            ),
        ).resolves.toBeInstanceOf(GetPartiesResponse);
        await expect(
            client.generateExternalPartyTopologyAsync(
                externalPartyRequest,
                options,
            ),
        ).resolves.toBeInstanceOf(GenerateExternalPartyTopologyResponse);
        await expect(
            client.allocateExternalPartyAsync(
                allocateExternalRequest,
                options,
            ),
        ).resolves.toBeInstanceOf(AllocateExternalPartyResponse);

        expect(listKnownPartiesAsync).toHaveBeenLastCalledWith(
            request,
            options,
        );
        expect(getParticipantIdAsync).toHaveBeenLastCalledWith(
            expect.any(GetParticipantIdRequest),
            options,
        );
        expect(getPartiesAsync).toHaveBeenLastCalledWith(
            expect.any(GetPartiesRequest),
            options,
        );
        expect(generateExternalPartyTopologyAsync).toHaveBeenLastCalledWith(
            externalPartyRequest,
            options,
        );
        expect(allocateExternalPartyAsync).toHaveBeenLastCalledWith(
            allocateExternalRequest,
            options,
        );
    });

    it("validates and preserves an external party lifecycle request", () => {
        const sign = vi.fn();

        const request = new CreateExternalPartyRequest({
            synchronizer: "sync::sandbox",
            partyHint: "alice",
            publicKey: new ExternalPartySigningPublicKey({
                format: ExternalPartyCryptoKeyFormat.raw,
                keyData: new Uint8Array([1, 2, 3]),
                keySpec: ExternalPartySigningKeySpec.ecCurve25519,
            }),
            sign,
            waitForAllocation: true,
        });

        expect(request.synchronizer).toBe("sync::sandbox");
        expect(request.partyHint).toBe("alice");
        expect(request.sign).toBe(sign);
        expect(request.waitForAllocation).toBe(true);
        expect(
            new CreateExternalPartyRequest({
                synchronizer: "sync::sandbox",
                partyHint: "secp-party",
                publicKey: new ExternalPartySigningPublicKey({
                    format: ExternalPartyCryptoKeyFormat.raw,
                    keyData: new Uint8Array([4, 5, 6]),
                    keySpec: ExternalPartySigningKeySpec.ecSecp256k1,
                }),
                sign,
            }).publicKey.keySpec,
        ).toBe(ExternalPartySigningKeySpec.ecSecp256k1);
        expect(() => new CreateExternalPartyRequest({ sign })).toThrow();
    });

    it("validates a decentralized party lifecycle request", () => {
        const sign = vi.fn();
        const owner = {
            publicKey: new ExternalPartySigningPublicKey({
                format: ExternalPartyCryptoKeyFormat.raw,
                keyData: new Uint8Array([1, 2, 3]),
                keySpec: ExternalPartySigningKeySpec.ecCurve25519,
            }),
            sign,
        };

        const request = new CreateDecentralizedPartyRequest({
            synchronizer: "sync::sandbox",
            partyHint: "consortium",
            owners: [owner, {
                publicKey: new ExternalPartySigningPublicKey({
                    format: ExternalPartyCryptoKeyFormat.raw,
                    keyData: new Uint8Array([4, 5, 6]),
                    keySpec: ExternalPartySigningKeySpec.ecCurve25519,
                }),
            }],
            ownerThreshold: 2,
            partySigningKeys: [owner],
            partySigningThreshold: 1,
        });

        expect(request.ownerThreshold).toBe(2);
        expect(request.partySigningThreshold).toBe(1);
        expect(request.owners[0].sign).toBe(sign);
        expect(() => new CreateDecentralizedPartyRequest({
            synchronizer: "sync::sandbox",
            partyHint: "consortium",
            owners: [owner],
            ownerThreshold: 1,
            partySigningKeys: [owner],
            partySigningThreshold: 1,
        })).toThrow(/two unique owner/i);
    });

    it("preserves immutable decentralized-party preparation metadata", () => {
        const prepared = new PreparedDecentralizedParty({
            partyId: "consortium::namespace",
            decentralizedNamespace: "namespace",
            ownerThreshold: 2,
            partySigningThreshold: 1,
        });

        expect(prepared.partyId).toBe("consortium::namespace");
        expect(prepared.decentralizedNamespace).toBe("namespace");
    });

    it("prepares decentralized topology through the injected topology writer", async () => {
        const generateTransactionsAsync = vi.fn(async () =>
            new GenerateTopologyTransactionsResponse({
                generatedTransactions: [
                    new GeneratedTopologyTransaction({
                        serializedTransaction: new Uint8Array([1]),
                        transactionHash: new Uint8Array([2]),
                    }),
                ],
            }),
        );
        const client = new PartyManagementServiceClient({
            getParticipantIdAsync: async () => new GetParticipantIdResponse({
                participantId: "participant::sandbox",
            }),
        } as never, { generateTransactionsAsync } as never);

        await expect(client.prepareDecentralizedPartyAsync(
            new CreateDecentralizedPartyRequest({
                synchronizer: "sync::sandbox",
                partyHint: "consortium",
                owners: [
                    { publicKey: new ExternalPartySigningPublicKey({ format: ExternalPartyCryptoKeyFormat.raw, keyData: new Uint8Array([1]), keySpec: ExternalPartySigningKeySpec.ecCurve25519 }) },
                    { publicKey: new ExternalPartySigningPublicKey({ format: ExternalPartyCryptoKeyFormat.raw, keyData: new Uint8Array([2]), keySpec: ExternalPartySigningKeySpec.ecCurve25519 }) },
                ],
                ownerThreshold: 2,
                partySigningKeys: [{ publicKey: new ExternalPartySigningPublicKey({ format: ExternalPartyCryptoKeyFormat.raw, keyData: new Uint8Array([3]), keySpec: ExternalPartySigningKeySpec.ecCurve25519 }) }],
                partySigningThreshold: 1,
                confirmationThreshold: 1,
            }),
        )).rejects.toThrow(/generated transaction count/i);

        expect(generateTransactionsAsync).toHaveBeenCalledTimes(1);
    });

    it("creates an external party with caller-provided signatures", async () => {
        const generated = new GenerateExternalPartyTopologyResponse({
            partyId: "alice::fingerprint",
            publicKeyFingerprint: "fingerprint",
            topologyTransactions: [
                new Uint8Array([1, 2, 3]),
                new Uint8Array([4, 5, 6]),
            ],
            multiHash: new Uint8Array([7, 8, 9]),
        });

        const generateExternalPartyTopologyAsync = vi.fn(async () => generated);

        const allocateExternalPartyAsync = vi.fn(
            async () => new AllocateExternalPartyResponse({ partyId: generated.partyId }),
        );

        const transport = {
            features: { supportsCommandSigning: false },
            getLedgerApiVersionAsync: async () => {
                throw new Error("not used");
            },
            getParticipantIdAsync: async () => {
                throw new Error("not used");
            },
            getPartiesAsync: async () => {
                throw new Error("not used");
            },
            allocatePartyAsync: async () => {
                throw new Error("not used");
            },
            generateExternalPartyTopologyAsync,
            allocateExternalPartyAsync,
            listKnownPartiesAsync: async () => {
                throw new Error("not used");
            },
            grantUserRightsAsync: async () => {
                throw new Error("not used");
            },
            uploadDarFileAsync: async () => {
                throw new Error("not used");
            },
            getActiveContractsPageAsync: async () => {
                throw new Error("not used");
            },
            getActiveContractsAsync: async () => {
                throw new Error("not used");
            },
            getUpdatesAsync: async () => {
                throw new Error("not used");
            },
            submitCommandAsync: async () => {
                throw new Error("not used");
            },
        };

        const client = new PartyManagementServiceClient(transport);

        const sign = vi.fn(async request => ({
            signature: new Uint8Array(request.payload),
            format: ExternalPartySignatureFormat.raw,
            signingAlgorithmSpec: ExternalPartySigningAlgorithmSpec.ed25519,
        }));

        const options = new RequestOptions({ timeoutMs: 5_000 });

        const result = await client.createExternalPartyAsync(
            new CreateExternalPartyRequest({
                synchronizer: "sync::sandbox",
                partyHint: "alice",
                publicKey: new ExternalPartySigningPublicKey({
                    format: ExternalPartyCryptoKeyFormat.raw,
                    keyData: new Uint8Array([10, 11, 12]),
                    keySpec: ExternalPartySigningKeySpec.ecCurve25519,
                }),
                sign,
                waitForAllocation: true,
            }),
            options,
        );

        expect(generateExternalPartyTopologyAsync).toHaveBeenCalledWith(
            expect.objectContaining({
                synchronizer: "sync::sandbox",
                partyHint: "alice",
            }),
            options,
        );
        expect(sign).toHaveBeenNthCalledWith(1, expect.objectContaining({
            payload: new Uint8Array([1, 2, 3]),
            kind: "topology-transaction",
            partyId: generated.partyId,
            publicKeyFingerprint: "fingerprint",
        }));
        expect(sign).toHaveBeenNthCalledWith(2, expect.objectContaining({
            payload: new Uint8Array([4, 5, 6]),
            kind: "topology-transaction",
            partyId: generated.partyId,
            publicKeyFingerprint: "fingerprint",
        }));
        expect(sign).toHaveBeenNthCalledWith(3, expect.objectContaining({
            payload: new Uint8Array([7, 8, 9]),
            kind: "multi-hash",
            partyId: generated.partyId,
            publicKeyFingerprint: "fingerprint",
        }));
        expect(allocateExternalPartyAsync).toHaveBeenCalledWith(
            expect.objectContaining({
                synchronizer: "sync::sandbox",
                waitForAllocation: true,
                multiHashSignatures: [expect.objectContaining({
                    signedByFingerprint: "fingerprint",
                })],
                onboardingTransactions: [
                    expect.objectContaining({
                        transaction: new Uint8Array([1, 2, 3]),
                        signatures: [expect.objectContaining({
                            signedByFingerprint: "fingerprint",
                        })],
                    }),
                    expect.objectContaining({
                        transaction: new Uint8Array([4, 5, 6]),
                    }),
                ],
            }),
            options,
        );
        expect(result.partyId).toBe(generated.partyId);

        const signerError = new Error("HSM unavailable");

        allocateExternalPartyAsync.mockClear();
        sign.mockRejectedValueOnce(signerError);

        await expect(
            client.createExternalPartyAsync(
                new CreateExternalPartyRequest({
                    synchronizer: "sync::sandbox",
                    partyHint: "signer-failure",
                    publicKey: new ExternalPartySigningPublicKey({
                        format: ExternalPartyCryptoKeyFormat.raw,
                        keyData: new Uint8Array([10, 11, 12]),
                        keySpec: ExternalPartySigningKeySpec.ecCurve25519,
                    }),
                    sign,
                }),
            ),
        ).rejects.toBe(signerError);
        expect(allocateExternalPartyAsync).not.toHaveBeenCalled();

        const topologyError = new Error("topology unavailable");

        sign.mockClear();
        generateExternalPartyTopologyAsync.mockRejectedValueOnce(topologyError);

        await expect(
            client.createExternalPartyAsync(
                new CreateExternalPartyRequest({
                    synchronizer: "sync::sandbox",
                    partyHint: "topology-failure",
                    publicKey: new ExternalPartySigningPublicKey({
                        format: ExternalPartyCryptoKeyFormat.raw,
                        keyData: new Uint8Array([10, 11, 12]),
                        keySpec: ExternalPartySigningKeySpec.ecCurve25519,
                    }),
                    sign,
                }),
            ),
        ).rejects.toBe(topologyError);
        expect(sign).not.toHaveBeenCalled();
    });
});
