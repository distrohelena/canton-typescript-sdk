import { describe, expect, it } from "vitest";
import {
    ExternalPartyCryptoKeyFormat,
    ExternalPartyOnboardingTransaction,
    ExternalPartySigningKeySpec,
    ExternalPartySigningPublicKey,
    ListKnownPartiesRequest,
} from "../../../src";
import {
    AllocateExternalPartyRequest,
    AllocateExternalPartyResponse,
    GenerateExternalPartyTopologyRequest,
    GenerateExternalPartyTopologyResponse,
} from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/party_management_service.js";
import { createFakeGrpcOperations } from "../../fixtures/fake-grpc-services.js";
import { PartyManagementServiceClient } from "../../../src/services/party-management/party-management-service-client.js";
import { GrpcTransport } from "../../../src/transports/grpc/grpc-transport.js";

describe("PartyManagementServiceClient with gRPC transport", () => {
    it("delegates listKnownParties through grpc operations", async () => {
        let capturedRequest: unknown;

        const transport = new GrpcTransport(
            createFakeGrpcOperations({
                listPartiesAsync: async request => {
                    capturedRequest = request;

                    return {
                        partyDetails: [{ party: "Alice", isLocal: true }],
                        nextPageToken: "next-1",
                    };
                },
            }),
        );

        const client = new PartyManagementServiceClient(transport);

        const result = await client.listKnownPartiesAsync(
            new ListKnownPartiesRequest({ filterParty: "Alice" }),
        );

        expect(capturedRequest).toMatchObject({ filterParty: "Alice" });
        expect(result.partyDetails[0].party).toBe("Alice");
    });

    it("delegates external-party ledger-admin calls through grpc operations", async () => {
        let capturedGenerateRequest: unknown;

        let capturedAllocateRequest: unknown;

        const transport = new GrpcTransport(
            createFakeGrpcOperations({
                generateExternalPartyTopologyAsync: async request => {
                    capturedGenerateRequest = request;

                    return {
                        partyId: "ed25519_party::fingerprint",
                        publicKeyFingerprint: "fingerprint",
                        topologyTransactions: [new Uint8Array([1, 2, 3])],
                        multiHash: new Uint8Array([4, 5, 6]),
                    };
                },
                allocateExternalPartyAsync: async request => {
                    capturedAllocateRequest = request;

                    return {
                        partyId: "ed25519_party::fingerprint",
                    };
                },
            }),
        );

        const client = new PartyManagementServiceClient(transport);

        const generated = await client.generateExternalPartyTopologyAsync(
            GenerateExternalPartyTopologyRequest.create({
                synchronizer: "sync::sandbox",
                partyHint: "ed25519_party",
            }),
        );

        const allocated = await client.allocateExternalPartyAsync(
            AllocateExternalPartyRequest.create({
                synchronizer: "sync::sandbox",
                onboardingTransactions: [
                    new ExternalPartyOnboardingTransaction({
                        transaction: new Uint8Array([7, 8, 9]),
                    }),
                ],
            }),
        );

        expect(capturedGenerateRequest).toMatchObject({
            synchronizer: "sync::sandbox",
            partyHint: "ed25519_party",
        });
        expect(capturedAllocateRequest).toMatchObject({
            synchronizer: "sync::sandbox",
        });
        expect(generated).toEqual(GenerateExternalPartyTopologyResponse.create({
            partyId: "ed25519_party::fingerprint",
            publicKeyFingerprint: "fingerprint",
            topologyTransactions: [new Uint8Array([1, 2, 3])],
            multiHash: new Uint8Array([4, 5, 6]),
        }));
        expect(generated.partyId).toBe("ed25519_party::fingerprint");
        expect(allocated).toEqual(AllocateExternalPartyResponse.create({ partyId: "ed25519_party::fingerprint" }));
        expect(allocated.partyId).toBe("ed25519_party::fingerprint");
    });
});
