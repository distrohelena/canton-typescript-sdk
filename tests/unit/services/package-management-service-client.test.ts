import { describe, expect, it, vi } from "vitest";
import {
    PackageManagementServiceClient,
    RequestOptions,
} from "../../../src";
import {
    ListKnownPackagesRequest,
    ListKnownPackagesResponse,
    UploadDarFileRequest,
    UploadDarFileResponse,
} from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/package_management_service.js";

describe("PackageManagementServiceClient", () => {
    it("forwards package management requests through the selected transport", async () => {
        const listKnownPackagesResponse = ListKnownPackagesResponse.create();
        const listKnownPackagesAsync = vi.fn(async () => listKnownPackagesResponse);

        const uploadDarFileResponse = UploadDarFileResponse.create();
        const uploadDarFileAsync = vi.fn(async () => uploadDarFileResponse);

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
            listKnownPackagesAsync,
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

        const request = UploadDarFileRequest.create({
            darFile: new Uint8Array([1, 2, 3]),
        });

        const options = new RequestOptions({
            timeoutMs: 5_000,
        });

        await expect(
            client.uploadDarFileAsync(request, options),
        ).resolves.toBe(uploadDarFileResponse);
        await expect(
            client.listKnownPackagesAsync(
                ListKnownPackagesRequest.create(),
                options,
            ),
        ).resolves.toBe(listKnownPackagesResponse);

        expect(uploadDarFileAsync).toHaveBeenCalledWith(request, options);
        expect(listKnownPackagesAsync).toHaveBeenCalledWith(
            ListKnownPackagesRequest.create(),
            options,
        );
    });
});
