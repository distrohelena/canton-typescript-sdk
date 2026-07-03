import { describe, expect, it, vi } from "vitest";
import {
    GetPackageContentsRequest,
    GetPackageRequest,
    GetPackageReferencesRequest,
    GetPackageStatusRequest,
    HashFunction,
    ListPackagesRequest,
    ListVettedPackagesRequest,
    PackageMetadataFilter,
    PackageStatus,
    ParticipantListPackagesRequest,
    RequestOptions,
    TopologyStateFilter,
} from "../../../src";
import { GrpcTransport } from "../../../src/transports/grpc/grpc-transport.js";

describe("GrpcTransport package services", () => {
    it("maps ledger package service requests and responses", async () => {
        const listPackagesAsync = vi.fn(async () => ({
            packageIds: ["pkg-1", "pkg-2"],
        }));

        const getPackageAsync = vi.fn(async () => ({
            hashFunction: 0,
            archivePayload: new Uint8Array([1, 2, 3]),
            hash: "hash-1",
        }));

        const getPackageStatusAsync = vi.fn(async () => ({
            packageStatus: 1,
        }));

        const listVettedPackagesAsync = vi.fn(async () => ({
            vettedPackages: [
                {
                    packages: [
                        {
                            packageId: "pkg-1",
                            validFromInclusive: {
                                seconds: "1710000000",
                                nanos: 0,
                            },
                            validUntilExclusive: {
                                seconds: "1710003600",
                                nanos: 0,
                            },
                            packageName: "Main",
                            packageVersion: "1.0.0",
                        },
                    ],
                    participantId: "participant-1",
                    synchronizerId: "sync-1",
                    topologySerial: 7,
                },
            ],
            nextPageToken: "page-2",
        }));

        const transport = new GrpcTransport({
            getHealthAsync: async () => ({
                version: "3.4.0",
                features: {},
            }),
            checkHealthAsync: async () => ({ status: 1 }),
            createPartyAsync: async () => ({ identifier: "unused" }),
            listPartiesAsync: async () => ({
                partyDetails: [],
                nextPageToken: "",
            }),
            grantUserRightsAsync: async () => ({ rights: [] }),
            uploadPackageAsync: async () => ({ packageId: "unused" }),
            queryContractsAsync: async () => ({ activeContracts: [] }),
            streamTransactionsAsync: async () => [],
            submitCommandAsync: async () => ({
                updateId: "unused",
                completionOffset: "0",
            }),
            listPackagesAsync,
            getPackageAsync,
            getPackageStatusAsync,
            listVettedPackagesAsync,
        } as any);

        const options = new RequestOptions({
            timeoutMs: 2_500,
        });

        const listPackagesResponse = await transport.listPackagesAsync(
            new ListPackagesRequest(),
            options,
        );

        const getPackageResponse = await transport.getPackageAsync(
            new GetPackageRequest({
                packageId: "pkg-1",
            }),
            options,
        );

        const getPackageStatusResponse = await transport.getPackageStatusAsync(
            new GetPackageStatusRequest({
                packageId: "pkg-1",
            }),
            options,
        );

        const listVettedPackagesResponse =
            await transport.listVettedPackagesAsync(
                new ListVettedPackagesRequest({
                    packageMetadataFilter: new PackageMetadataFilter({
                        packageIds: ["pkg-1"],
                        packageNamePrefixes: ["Main"],
                    }),
                    topologyStateFilter: new TopologyStateFilter({
                        participantIds: ["participant-1"],
                        synchronizerIds: ["sync-1"],
                    }),
                    pageToken: "page-1",
                    pageSize: 5,
                }),
                options,
            );

        expect(listPackagesAsync).toHaveBeenLastCalledWith({}, options);
        expect(getPackageAsync).toHaveBeenLastCalledWith({
            packageId: "pkg-1",
        }, options);
        expect(getPackageStatusAsync).toHaveBeenLastCalledWith({
            packageId: "pkg-1",
        }, options);
        expect(listVettedPackagesAsync).toHaveBeenLastCalledWith({
            packageMetadataFilter: {
                packageIds: ["pkg-1"],
                packageNamePrefixes: ["Main"],
            },
            topologyStateFilter: {
                participantIds: ["participant-1"],
                synchronizerIds: ["sync-1"],
            },
            pageToken: "page-1",
            pageSize: 5,
        }, options);
        expect(listPackagesResponse.packageIds).toEqual(["pkg-1", "pkg-2"]);
        expect(getPackageResponse.hashFunction).toBe(HashFunction.sha256);
        expect(getPackageResponse.archivePayload).toEqual(new Uint8Array([1, 2, 3]));
        expect(getPackageResponse.hash).toBe("hash-1");
        expect(getPackageStatusResponse.packageStatus).toBe(PackageStatus.registered);
        expect(listVettedPackagesResponse.nextPageToken).toBe("page-2");
        expect(listVettedPackagesResponse.vettedPackages).toHaveLength(1);
        expect(listVettedPackagesResponse.vettedPackages[0]).toMatchObject({
            participantId: "participant-1",
            synchronizerId: "sync-1",
            topologySerial: 7,
        });
        expect(listVettedPackagesResponse.vettedPackages[0].packages[0]).toMatchObject({
            packageId: "pkg-1",
            packageName: "Main",
            packageVersion: "1.0.0",
        });
        expect(
            listVettedPackagesResponse.vettedPackages[0].packages[0].validFromInclusive,
        ).toEqual(new Date("2024-03-09T16:00:00.000Z"));
        expect(
            listVettedPackagesResponse.vettedPackages[0].packages[0].validUntilExclusive,
        ).toEqual(new Date("2024-03-09T17:00:00.000Z"));
    });

    it("maps participant package service requests and responses", async () => {
        const listParticipantPackagesAsync = vi.fn(async () => ({
            packageDescriptions: [
                {
                    packageId: "pkg-1",
                    name: "Main",
                    version: "1.0.0",
                    uploadedAt: {
                        seconds: "1710000000",
                        nanos: 0,
                    },
                    size: 123,
                },
            ],
        }));

        const getParticipantPackageContentsAsync = vi.fn(async () => ({
            description: {
                packageId: "pkg-1",
                name: "Main",
                version: "1.0.0",
                uploadedAt: {
                    seconds: "1710000000",
                    nanos: 0,
                },
                size: 123,
            },
            modules: [
                {
                    name: "Main.Module",
                },
            ],
            isUtilityPackage: false,
            languageVersion: "2.dev",
        }));

        const getParticipantPackageReferencesAsync = vi.fn(async () => ({
            dars: [
                {
                    main: "pkg-1",
                    name: "main-dar",
                    version: "1.0.0",
                    description: "Main DAR",
                },
            ],
        }));

        const transport = new GrpcTransport({
            getHealthAsync: async () => ({
                version: "3.4.0",
                features: {},
            }),
            checkHealthAsync: async () => ({ status: 1 }),
            createPartyAsync: async () => ({ identifier: "unused" }),
            listPartiesAsync: async () => ({
                partyDetails: [],
                nextPageToken: "",
            }),
            grantUserRightsAsync: async () => ({ rights: [] }),
            uploadPackageAsync: async () => ({ packageId: "unused" }),
            queryContractsAsync: async () => ({ activeContracts: [] }),
            streamTransactionsAsync: async () => [],
            submitCommandAsync: async () => ({
                updateId: "unused",
                completionOffset: "0",
            }),
            listParticipantPackagesAsync,
            getParticipantPackageContentsAsync,
            getParticipantPackageReferencesAsync,
        } as any);

        const options = new RequestOptions({
            timeoutMs: 2_500,
        });

        const listPackagesResponse = await transport.listParticipantPackagesAsync(
            new ParticipantListPackagesRequest({
                limit: 20,
                filterName: "Main",
            }),
            options,
        );

        const getPackageContentsResponse =
            await transport.getParticipantPackageContentsAsync(
                new GetPackageContentsRequest({
                    packageId: "pkg-1",
                }),
                options,
            );

        const getPackageReferencesResponse =
            await transport.getParticipantPackageReferencesAsync(
                new GetPackageReferencesRequest({
                    packageId: "pkg-1",
                }),
                options,
            );

        expect(listParticipantPackagesAsync).toHaveBeenLastCalledWith({
            limit: 20,
            filterName: "Main",
        }, options);
        expect(getParticipantPackageContentsAsync).toHaveBeenLastCalledWith({
            packageId: "pkg-1",
        }, options);
        expect(getParticipantPackageReferencesAsync).toHaveBeenLastCalledWith({
            packageId: "pkg-1",
        }, options);
        expect(listPackagesResponse.packageDescriptions[0]).toMatchObject({
            packageId: "pkg-1",
            name: "Main",
            version: "1.0.0",
            size: 123,
        });
        expect(listPackagesResponse.packageDescriptions[0].uploadedAt).toEqual(
            new Date("2024-03-09T16:00:00.000Z"),
        );
        expect(getPackageContentsResponse.description).toMatchObject({
            packageId: "pkg-1",
            name: "Main",
            version: "1.0.0",
            size: 123,
        });
        expect(getPackageContentsResponse.modules).toEqual([
            { name: "Main.Module" },
        ]);
        expect(getPackageContentsResponse.isUtilityPackage).toBe(false);
        expect(getPackageContentsResponse.languageVersion).toBe("2.dev");
        expect(getPackageReferencesResponse.dars).toEqual([
            {
                main: "pkg-1",
                name: "main-dar",
                version: "1.0.0",
                description: "Main DAR",
            },
        ]);
    });
});
