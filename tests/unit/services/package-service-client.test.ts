import { describe, expect, it, vi } from "vitest";
import {
    GetPackageRequest,
    GetPackageStatusRequest,
    ListPackagesRequest,
    ListPackagesResponse,
    ListVettedPackagesRequest,
    PackageServiceClient,
    RequestOptions,
} from "../../../src";

describe("PackageServiceClient", () => {
    it("forwards ledger package read requests through the selected transport", async () => {
        const listPackagesAsync = vi.fn(
            async () =>
                new ListPackagesResponse({
                    packageIds: ["pkg-1"],
                }),
        );

        const getPackageAsync = vi.fn(async () => ({
            hashFunction: "sha256",
            archivePayload: new Uint8Array([1, 2, 3]),
            hash: "pkg-1",
        }));

        const getPackageStatusAsync = vi.fn(async () => ({
            packageStatus: "registered",
        }));

        const listVettedPackagesAsync = vi.fn(async () => ({
            vettedPackages: [],
            nextPageToken: "next-1",
        }));

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
            client.listPackagesAsync(new ListPackagesRequest(), options),
        ).resolves.toMatchObject({
            packageIds: ["pkg-1"],
        });
        await client.getPackageAsync(
            new GetPackageRequest({
                packageId: "pkg-1",
            }),
            options,
        );
        await client.getPackageStatusAsync(
            new GetPackageStatusRequest({
                packageId: "pkg-1",
            }),
            options,
        );
        await client.listVettedPackagesAsync(
            new ListVettedPackagesRequest(),
            options,
        );

        expect(listPackagesAsync).toHaveBeenLastCalledWith(
            expect.any(ListPackagesRequest),
            options,
        );
        expect(getPackageAsync).toHaveBeenLastCalledWith(
            expect.any(GetPackageRequest),
            options,
        );
        expect(getPackageStatusAsync).toHaveBeenLastCalledWith(
            expect.any(GetPackageStatusRequest),
            options,
        );
        expect(listVettedPackagesAsync).toHaveBeenLastCalledWith(
            expect.any(ListVettedPackagesRequest),
            options,
        );
    });
});
