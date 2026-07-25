import { describe, expect, it, vi } from "vitest";
import {
    PackageServiceClient,
    RequestOptions,
} from "../../../src";
import {
    GetPackageRequest,
    GetPackageResponse,
    GetPackageStatusRequest,
    GetPackageStatusResponse,
    ListPackagesRequest,
    ListPackagesResponse,
    ListVettedPackagesRequest,
    ListVettedPackagesResponse,
} from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/package_service.js";

describe("PackageServiceClient", () => {
    it("forwards ledger package read requests through the selected transport", async () => {
        const listPackagesResponse = ListPackagesResponse.create({
            packageIds: ["pkg-1"],
        });
        const listPackagesAsync = vi.fn(async () => listPackagesResponse);

        const getPackageResponse = GetPackageResponse.create({
            hashFunction: 1,
            archivePayload: new Uint8Array([1, 2, 3]),
            hash: "pkg-1",
        });
        const getPackageAsync = vi.fn(async () => getPackageResponse);

        const getPackageStatusResponse = GetPackageStatusResponse.create({
            packageStatus: 1,
        });
        const getPackageStatusAsync = vi.fn(async () => getPackageStatusResponse);

        const listVettedPackagesResponse = ListVettedPackagesResponse.create({
            vettedPackages: [],
            nextPageToken: "next-1",
        });
        const listVettedPackagesAsync = vi.fn(async () => listVettedPackagesResponse);

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
            listPackagesAsync,
            getPackageAsync,
            getPackageStatusAsync,
            listVettedPackagesAsync,
            listParticipantPackagesAsync: async () => {
                throw new Error("not used");
            },
            getParticipantPackageContentsAsync: async () => {
                throw new Error("not used");
            },
            getParticipantPackageReferencesAsync: async () => {
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

        const client = new PackageServiceClient(transport as never);

        const options = new RequestOptions({
            timeoutMs: 5_000,
        });

        await expect(
            client.listPackagesAsync(ListPackagesRequest.create(), options),
        ).resolves.toBe(listPackagesResponse);
        await expect(client.getPackageAsync(
            GetPackageRequest.create({
                packageId: "pkg-1",
            }),
            options,
        )).resolves.toBe(getPackageResponse);
        await expect(client.getPackageStatusAsync(
            GetPackageStatusRequest.create({
                packageId: "pkg-1",
            }),
            options,
        )).resolves.toBe(getPackageStatusResponse);
        await expect(client.listVettedPackagesAsync(
            ListVettedPackagesRequest.create(),
            options,
        )).resolves.toBe(listVettedPackagesResponse);

        expect(listPackagesAsync).toHaveBeenLastCalledWith(
            ListPackagesRequest.create(),
            options,
        );
        expect(getPackageAsync).toHaveBeenLastCalledWith(
            GetPackageRequest.create({ packageId: "pkg-1" }),
            options,
        );
        expect(getPackageStatusAsync).toHaveBeenLastCalledWith(
            GetPackageStatusRequest.create({ packageId: "pkg-1" }),
            options,
        );
        expect(listVettedPackagesAsync).toHaveBeenLastCalledWith(
            ListVettedPackagesRequest.create(),
            options,
        );
    });
});
