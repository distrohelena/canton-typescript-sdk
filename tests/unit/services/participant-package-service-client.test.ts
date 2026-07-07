import { describe, expect, it, vi } from "vitest";
import {
    GetDarContentsRequest,
    GetDarRequest,
    GetPackageContentsRequest,
    GetPackageReferencesRequest,
    ListDarsRequest,
    ParticipantListPackagesRequest,
    GetDarContentsResponse,
    GetDarResponse,
    ListDarsResponse,
    ParticipantPackageServiceClient,
    RequestOptions,
} from "../../../src";

describe("ParticipantPackageServiceClient", () => {
    it("forwards participant package requests through the selected transport", async () => {
        const listParticipantPackagesAsync = vi.fn(async () => ({
            packageDescriptions: [],
        }));

        const getParticipantPackageContentsAsync = vi.fn(async () => ({
            modules: [],
            isUtilityPackage: false,
            languageVersion: "2.dev",
        }));

        const getParticipantPackageReferencesAsync = vi.fn(async () => ({
            dars: [],
        }));

        const getParticipantDarAsync = vi.fn(
            async () =>
                new GetDarResponse({
                    payload: new Uint8Array([1, 2, 3]),
                }),
        );

        const listParticipantDarsAsync = vi.fn(
            async () =>
                new ListDarsResponse({
                    dars: [],
                }),
        );

        const getParticipantDarContentsAsync = vi.fn(
            async () =>
                new GetDarContentsResponse({
                    packages: [],
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
            listParticipantPackagesAsync,
            getParticipantPackageContentsAsync,
            getParticipantPackageReferencesAsync,
            getParticipantDarAsync,
            listParticipantDarsAsync,
            getParticipantDarContentsAsync,
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

        const client = new ParticipantPackageServiceClient(transport as never);

        expect("uploadDarFileAsync" in client).toBe(false);

        const options = new RequestOptions({
            timeoutMs: 5_000,
        });

        await client.listPackagesAsync(
            new ParticipantListPackagesRequest({
                limit: 10,
            }),
            options,
        );
        await client.getPackageContentsAsync(
            new GetPackageContentsRequest({
                packageId: "pkg-1",
            }),
            options,
        );
        await client.getPackageReferencesAsync(
            new GetPackageReferencesRequest({
                packageId: "pkg-1",
            }),
            options,
        );
        await client.getDarAsync(
            new GetDarRequest({
                mainPackageId: "pkg-1",
            }),
            options,
        );
        await client.listDarsAsync(
            new ListDarsRequest({
                limit: 10,
            }),
            options,
        );
        await client.getDarContentsAsync(
            new GetDarContentsRequest({
                mainPackageId: "pkg-1",
            }),
            options,
        );

        expect(listParticipantPackagesAsync).toHaveBeenLastCalledWith(
            expect.any(ParticipantListPackagesRequest),
            options,
        );
        expect(getParticipantPackageContentsAsync).toHaveBeenLastCalledWith(
            expect.any(GetPackageContentsRequest),
            options,
        );
        expect(getParticipantPackageReferencesAsync).toHaveBeenLastCalledWith(
            expect.any(GetPackageReferencesRequest),
            options,
        );
        expect(getParticipantDarAsync).toHaveBeenLastCalledWith(
            expect.any(GetDarRequest),
            options,
        );
        expect(listParticipantDarsAsync).toHaveBeenLastCalledWith(
            expect.any(ListDarsRequest),
            options,
        );
        expect(getParticipantDarContentsAsync).toHaveBeenLastCalledWith(
            expect.any(GetDarContentsRequest),
            options,
        );
    });
});
