import { describe, expect, it, vi } from "vitest";
import {
    ParticipantStatusServiceClient,
    RequestOptions,
} from "../../../src";
import {
    ParticipantStatusRequest,
    ParticipantStatusResponse,
} from "../../../src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/participant_status_service.js";

describe("ParticipantStatusServiceClient", () => {
    it("forwards participant status requests through the selected transport", async () => {
        const response = ParticipantStatusResponse.create({
            kind: {
                oneofKind: "status",
                status: {
                    active: true,
                    connectedSynchronizers: [],
                    supportedProtocolVersions: [30],
                },
            },
        });

        const getParticipantStatusAsync = vi.fn(async () => response);

        const transport = {
            features: { supportsCommandSigning: false },
            disposeAsync: async () => undefined,
            getLedgerApiVersionAsync: async () => {
                throw new Error("not used");
            },
            checkHealthAsync: async () => {
                throw new Error("not used");
            },
            allocatePartyAsync: async () => {
                throw new Error("not used");
            },
            listKnownPartiesAsync: async () => {
                throw new Error("not used");
            },
            grantUserRightsAsync: async () => {
                throw new Error("not used");
            },
            uploadDarFileAsync: async () => {
                throw new Error("not used");
            },
            listPackagesAsync: async () => {
                throw new Error("not used");
            },
            getPackageAsync: async () => {
                throw new Error("not used");
            },
            getPackageStatusAsync: async () => {
                throw new Error("not used");
            },
            listVettedPackagesAsync: async () => {
                throw new Error("not used");
            },
            listParticipantPackagesAsync: async () => {
                throw new Error("not used");
            },
            getParticipantPackageContentsAsync: async () => {
                throw new Error("not used");
            },
            getParticipantPackageReferencesAsync: async () => {
                throw new Error("not used");
            },
            getParticipantStatusAsync,
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

        const client = new ParticipantStatusServiceClient(transport as never);

        const request = ParticipantStatusRequest.create();

        const options = new RequestOptions({
            timeoutMs: 5_000,
        });

        await expect(
            client.getParticipantStatusAsync(
                request,
                options,
            ),
        ).resolves.toEqual(response);

        expect(getParticipantStatusAsync).toHaveBeenCalledWith(
            request,
            options,
        );
    });
});
