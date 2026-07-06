import { describe, expect, it } from "vitest";
import {
    AdminComponentHealthKind,
    AdminComponentStatus,
    AdminNodeStatus,
    AdminNotInitializedExternalInputKind,
    AdminNotInitializedStatus,
    CantonClient,
    CantonClientOptions,
    ConnectedSynchronizerHealth,
    ConnectedSynchronizerStatus,
    GetParticipantStatusRequest,
    GetParticipantStatusResponse,
    GetPackageContentsRequest,
    GetPackageContentsResponse,
    GetPackageReferencesRequest,
    GetPackageReferencesResponse,
    GetPackageRequest,
    GetPackageResponse,
    GetPackageStatusRequest,
    GetPackageStatusResponse,
    EndpointNotConfiguredError,
    HashFunction,
    HealthCheckStatus,
    HealthServiceClient,
    ListPackagesRequest,
    ListPackagesResponse,
    ListVettedPackagesRequest,
    ListVettedPackagesResponse,
    ParticipantDarDescription,
    ParticipantListPackagesRequest,
    ParticipantListPackagesResponse,
    ParticipantNodeStatus,
    ParticipantModuleDescription,
    ParticipantPackageDescription,
    ParticipantPackageServiceClient,
    PartyManagementServiceClient,
    PackageManagementServiceClient,
    PackageServiceClient,
    PackageStatus,
    RequestOptions,
    TransportKind,
    VersionServiceClient,
} from "../../../src";

describe("package surface", () => {
    it("exports the grpc-shaped root client types", () => {
        expect(CantonClient).toBeTypeOf("function");
        expect(CantonClientOptions).toBeTypeOf("function");
        expect(HealthServiceClient).toBeTypeOf("function");
        expect(HealthCheckStatus.serving).toBe("serving");
        expect(VersionServiceClient).toBeTypeOf("function");
        expect(PartyManagementServiceClient).toBeTypeOf("function");
        expect(PackageServiceClient).toBeTypeOf("function");
        expect(PackageManagementServiceClient).toBeTypeOf("function");
        expect(ParticipantPackageServiceClient).toBeTypeOf("function");
        expect(EndpointNotConfiguredError).toBeTypeOf("function");
        expect(RequestOptions).toBeTypeOf("function");
        expect(TransportKind.grpc).toBe("grpc");
        expect(AdminNodeStatus).toBeTypeOf("function");
        expect(AdminNotInitializedStatus).toBeTypeOf("function");
        expect(AdminComponentStatus).toBeTypeOf("function");
        expect(AdminComponentHealthKind.ok).toBe("ok");
        expect(AdminNotInitializedExternalInputKind.id).toBe("id");
        expect(ConnectedSynchronizerHealth.healthy).toBe("healthy");

        const listPackagesRequest = new ListPackagesRequest();

        const getParticipantStatusRequest = new GetParticipantStatusRequest();

        const getPackageContentsRequest = new GetPackageContentsRequest({
            packageId: "pkg-1",
        });

        const getPackageReferencesRequest = new GetPackageReferencesRequest({
            packageId: "pkg-1",
        });

        const getPackageRequest = new GetPackageRequest({ packageId: "pkg-1" });

        const getPackageStatusRequest = new GetPackageStatusRequest({
            packageId: "pkg-1",
        });

        const listVettedPackagesRequest = new ListVettedPackagesRequest();

        const participantListPackagesRequest = new ParticipantListPackagesRequest({
            limit: 25,
        });

        const getParticipantStatusResponse = new GetParticipantStatusResponse({
            status: new ParticipantNodeStatus({
                uid: "participant::sandbox",
                active: true,
                version: "3.4.0",
                connectedSynchronizers: [
                    new ConnectedSynchronizerStatus({
                        physicalSynchronizerId: "sync::sandbox",
                        health: ConnectedSynchronizerHealth.healthy,
                    }),
                ],
                supportedProtocolVersions: [30],
                components: [],
                ports: {},
            }),
        });

        expect(listPackagesRequest).toBeInstanceOf(ListPackagesRequest);
        expect(getParticipantStatusRequest).toBeInstanceOf(
            GetParticipantStatusRequest,
        );
        expect(getPackageContentsRequest.packageId).toBe("pkg-1");
        expect(getPackageReferencesRequest.packageId).toBe("pkg-1");
        expect(getPackageRequest.packageId).toBe("pkg-1");
        expect(getPackageStatusRequest.packageId).toBe("pkg-1");
        expect(listVettedPackagesRequest).toBeInstanceOf(
            ListVettedPackagesRequest,
        );
        expect(participantListPackagesRequest.limit).toBe(25);
        expect(getParticipantStatusResponse.status?.active).toBe(true);
        expect(new ListPackagesResponse({ packageIds: ["pkg-1"] })).toBeInstanceOf(
            ListPackagesResponse,
        );
        expect(
            new GetPackageResponse({
                archivePayload: new Uint8Array([1, 2, 3]),
                hash: "pkg-1",
                hashFunction: HashFunction.sha256,
            }),
        ).toBeInstanceOf(GetPackageResponse);
        expect(
            new GetPackageStatusResponse({
                packageStatus: PackageStatus.registered,
            }),
        ).toBeInstanceOf(GetPackageStatusResponse);
        expect(
            new ListVettedPackagesResponse({
                vettedPackages: [],
            }),
        ).toBeInstanceOf(ListVettedPackagesResponse);
        expect(
            new ParticipantListPackagesResponse({
                packageDescriptions: [],
            }),
        ).toBeInstanceOf(ParticipantListPackagesResponse);
        expect(
            new GetPackageContentsResponse({
                modules: [],
                isUtilityPackage: false,
                languageVersion: "2.dev",
            }),
        ).toBeInstanceOf(GetPackageContentsResponse);
        expect(
            new GetPackageReferencesResponse({
                dars: [],
            }),
        ).toBeInstanceOf(GetPackageReferencesResponse);
        expect(
            new ParticipantPackageDescription({
                packageId: "pkg-1",
                name: "Main",
                version: "1.0.0",
                size: 42,
            }),
        ).toBeInstanceOf(ParticipantPackageDescription);
        expect(
            new ParticipantModuleDescription({
                name: "Main.Module",
            }),
        ).toBeInstanceOf(ParticipantModuleDescription);
        expect(
            new ParticipantDarDescription({
                main: "pkg-1",
                name: "main-dar",
                version: "1.0.0",
                description: "demo",
            }),
        ).toBeInstanceOf(ParticipantDarDescription);
        expect(HashFunction.sha256).toBe("sha256");
        expect(PackageStatus.registered).toBe("registered");
    });

    it("does not export legacy root surface names", async () => {
        const sdkModule = await import("../../../src/index.js");

        expect(sdkModule).not.toHaveProperty("SystemClient");
        expect(sdkModule).not.toHaveProperty("PartiesClient");
        expect(sdkModule).not.toHaveProperty("UsersClient");
        expect(sdkModule).not.toHaveProperty("PackagesClient");
        expect(sdkModule).not.toHaveProperty("ContractsClient");
        expect(sdkModule).not.toHaveProperty("EventsClient");
        expect(sdkModule).not.toHaveProperty("CommandsClient");
        expect(sdkModule).not.toHaveProperty("CreatePartyRequest");
        expect(sdkModule).not.toHaveProperty("CreatePartyResponse");
        expect(sdkModule).not.toHaveProperty("ListPartiesRequest");
        expect(sdkModule).not.toHaveProperty("ListPartiesResponse");
        expect(sdkModule).not.toHaveProperty("UploadPackageRequest");
        expect(sdkModule).not.toHaveProperty("UploadPackageResponse");
        expect(sdkModule).not.toHaveProperty("QueryContractsRequest");
        expect(sdkModule).not.toHaveProperty("QueryContractsResponse");
        expect(sdkModule).not.toHaveProperty("StreamQueryRequest");
        expect(sdkModule).not.toHaveProperty("StreamTransactionsRequest");
        expect(sdkModule).not.toHaveProperty("HealthStatusResponse");
    });
});
