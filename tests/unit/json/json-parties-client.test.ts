import { describe, expect, it, vi } from "vitest";
import {
    AllocateExternalPartyRequest,
    AllocatePartyRequest,
    ExternalPartyCryptoKeyFormat,
    ExternalPartySigningKeySpec,
    ExternalPartySigningPublicKey,
    GenerateExternalPartyTopologyRequest,
    ListKnownPartiesRequest,
} from "../../../src";
import { PartyManagementServiceClient } from "../../../src/services/party-management/party-management-service-client.js";
import { CreateExternalPartyRequest } from "../../../src/core/types/requests/create-external-party-request.js";
import { JsonTransport } from "../../../src/transports/json/json-transport.js";

describe("PartyManagementServiceClient with JSON transport", () => {
    it("calls /v2/parties with the shared query parameters", async () => {
        let requestedPath = "";

        const transport = new JsonTransport({
            getAsync: async (path: string) => {
                requestedPath = path;

                return {
                    partyDetails: [
                        {
                            party: "Alice",
                            isLocal: true,
                        },
                    ],
                    nextPageToken: "next-1",
                };
            },
            postAsync: async () => ({}),
        });

        const client = new PartyManagementServiceClient(transport);

        const result = await client.listKnownPartiesAsync(
            new ListKnownPartiesRequest({
                identityProviderId: "default",
                filterParty: "Alice",
                pageSize: 25,
                pageToken: "token-1",
            }),
        );

        expect(requestedPath).toBe(
            "/v2/parties?identity-provider-id=default&filter-party=Alice&pageSize=25&pageToken=token-1",
        );
        expect(result.partyDetails[0].party).toBe("Alice");
    });

    it("calls /v2/parties to allocate a party and maps partyDetails", async () => {
        let requestedPath = "";

        let requestedBody: unknown;

        const transport = new JsonTransport({
            getAsync: async () => ({
                partyDetails: [],
            }),
            postAsync: async (path: string, body: unknown) => {
                requestedPath = path;
                requestedBody = body;

                return {
                    partyDetails: {
                        party: "sdk-live-party-json",
                    },
                };
            },
        });

        const client = new PartyManagementServiceClient(transport);

        const result = await client.allocatePartyAsync(
            new AllocatePartyRequest({
                partyIdHint: "sdk-live-party-json",
                displayName: "SDK Live Party",
            }),
        );

        expect(requestedPath).toBe("/v2/parties");
        expect(requestedBody).toMatchObject({
            partyIdHint: "sdk-live-party-json",
        });
        expect(result.party).toBe("sdk-live-party-json");
    });

    it("rejects external-party ledger-admin methods on json transport", async () => {
        const transport = new JsonTransport({
            getAsync: async () => ({}),
            postAsync: async () => ({}),
        });

        const client = new PartyManagementServiceClient(transport);

        await expect(
            client.generateExternalPartyTopologyAsync(
                new GenerateExternalPartyTopologyRequest({
                    synchronizer: "sync::sandbox",
                    partyHint: "ed25519_party",
                    publicKey: new ExternalPartySigningPublicKey({
                        format: ExternalPartyCryptoKeyFormat.raw,
                        keyData: new Uint8Array([1, 2, 3]),
                        keySpec: ExternalPartySigningKeySpec.ecCurve25519,
                    }),
                }),
            ),
        ).rejects.toThrow(
            "PartyManagementService.GenerateExternalPartyTopology is not supported by json transport",
        );

        await expect(
            client.allocateExternalPartyAsync(
                new AllocateExternalPartyRequest({
                    synchronizer: "sync::sandbox",
                }),
            ),
        ).rejects.toThrow(
            "PartyManagementService.AllocateExternalParty is not supported by json transport",
        );
    });

    it("rejects lifecycle creation before invoking its signer on json transport", async () => {
        const transport = new JsonTransport({
            getAsync: async () => ({}),
            postAsync: async () => ({}),
        });

        const client = new PartyManagementServiceClient(transport);

        const sign = vi.fn();

        await expect(
            client.createExternalPartyAsync(
                new CreateExternalPartyRequest({
                    synchronizer: "sync::sandbox",
                    partyHint: "alice",
                    publicKey: new ExternalPartySigningPublicKey({
                        format: ExternalPartyCryptoKeyFormat.raw,
                        keyData: new Uint8Array([1, 2, 3]),
                        keySpec: ExternalPartySigningKeySpec.ecCurve25519,
                    }),
                    sign,
                }),
            ),
        ).rejects.toThrow(
            "PartyManagementService.GenerateExternalPartyTopology is not supported by json transport",
        );
        expect(sign).not.toHaveBeenCalled();
    });
});
