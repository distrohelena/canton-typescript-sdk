import { describe, expect, it, vi } from "vitest";
import {
    AllocateExternalPartyRequest,
    AllocateExternalPartyResponse,
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
});
