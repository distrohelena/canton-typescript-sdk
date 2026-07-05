import { describe, expect, it, vi } from "vitest";
import {
    GetParticipantStatusRequest,
    GetParticipantStatusResponse,
    ParticipantNodeStatus,
    ParticipantStatusServiceClient,
    RequestOptions,
} from "../../../src";

describe("ParticipantStatusServiceClient", () => {
    it("forwards participant status requests through the selected transport", async () => {
        const getParticipantStatusAsync = vi.fn(
            async () =>
                new GetParticipantStatusResponse({
                    status: new ParticipantNodeStatus({
                        uid: "participant::sandbox",
                        active: true,
                        version: "3.4.0",
                        connectedSynchronizers: [],
                        supportedProtocolVersions: [30],
                        components: [],
                        ports: {},
                    }),
                }),
        );

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

        const request = new GetParticipantStatusRequest();

        const options = new RequestOptions({
            timeoutMs: 5_000,
        });

        await expect(
            client.getParticipantStatusAsync(
                request,
                options,
            ),
        ).resolves.toBeInstanceOf(GetParticipantStatusResponse);

        expect(getParticipantStatusAsync).toHaveBeenCalledWith(
            request,
            options,
        );
    });
});
