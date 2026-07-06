import { describe, expect, it, vi } from "vitest";
import {
    PackageManagementServiceClient,
    RequestOptions,
    UploadDarFileRequest,
    UploadDarFileResponse,
} from "../../../src";

describe("PackageManagementServiceClient", () => {
    it("forwards package management requests through the selected transport", async () => {
        const uploadDarFileAsync = vi.fn(
            async () =>
                new UploadDarFileResponse({
                    packageId: "pkg-1",
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
            uploadDarFileAsync,
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
            getParticipantStatusAsync: async () => {
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

        const client = new PackageManagementServiceClient(transport as never);

        const request = new UploadDarFileRequest({
            bytes: new Uint8Array([1, 2, 3]),
        });

        const options = new RequestOptions({
            timeoutMs: 5_000,
        });

        await expect(
            client.uploadDarFileAsync(request, options),
        ).resolves.toBeInstanceOf(UploadDarFileResponse);

        expect(uploadDarFileAsync).toHaveBeenCalledWith(request, options);
    });
});
