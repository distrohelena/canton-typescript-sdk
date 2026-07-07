import { describe, expect, it, vi } from "vitest";
import {
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
    });
});
