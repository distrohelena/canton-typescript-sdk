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
    GetPackageRequest,
    GetPackageResponse,
    GetPackageStatusRequest,
    GetPackageStatusResponse,
    EndpointNotConfiguredError,
    ExternalPartyCryptoKeyFormat,
    ExternalPartyOnboardingTransaction,
    ExternalPartySignature,
    ExternalPartySignatureFormat,
    ExternalPartySigningAlgorithmSpec,
    ExternalPartySigningKeySpec,
    ExternalPartySigningPublicKey,
    HashFunction,
    HealthServiceClient,
    ListPackagesRequest,
    ListPackagesResponse,
    ListVettedPackagesRequest,
    ListVettedPackagesResponse,
    ParticipantDarDescription,
    ParticipantNodeStatus,
    ParticipantModuleDescription,
    ParticipantPackageServiceClient,
    PartyManagementServiceClient,
    PartyToParticipant,
    PackageManagementServiceClient,
    PackageServiceClient,
    PackageStatus,
    ParticipantPermission,
    RequestOptions,
    TopologyBaseQuery,
    TopologyBaseResult,
    TopologySignatureFormat,
    TopologyTransactionSignature,
    MultiTopologyTransactionSignature,
    SignedTopologyTransaction,
    GeneratedTopologyTransaction,
    PreparedTopologyTransaction,
    ExternalTopologySignature,
    TopologyMappingCode,
    TopologyMappingOperation,
    TopologyMappingResult,
    TopologyStoreId,
    TopologyTransactions,
    AssembleSignedTopologyTransactionsRequest,
    TransportKind,
    VersionServiceClient,
    WaitForPartyHostingRequest,
} from "../../../src";
import { comDaml, comDigitalasset, google } from "../../../src/protobuf";

const ledgerApi = comDaml.ledger.api.v2;
const participantAdmin = comDigitalasset.canton.admin.participant.v30;
const grpcHealth = google.grpc.health.v1;

const GetPackageContentsRequest = participantAdmin.GetPackageContentsRequest;
const GetPackageContentsResponse = participantAdmin.GetPackageContentsResponse;
const GetPackageReferencesRequest = participantAdmin.GetPackageReferencesRequest;
const GetPackageReferencesResponse = participantAdmin.GetPackageReferencesResponse;
const ParticipantListPackagesRequest = participantAdmin.ListPackagesRequest;
const ParticipantListPackagesResponse = participantAdmin.ListPackagesResponse;
const ParticipantPackageDescription = participantAdmin.PackageDescription;
const ParticipantStatusRequest = participantAdmin.ParticipantStatusRequest;
const ParticipantStatusResponse = participantAdmin.ParticipantStatusResponse;

describe("package surface", () => {
    it("exports the grpc-shaped root client types", () => {
        expect(CantonClient).toBeTypeOf("function");
        expect(CantonClientOptions).toBeTypeOf("function");
        expect(HealthServiceClient).toBeTypeOf("function");
        expect(grpcHealth.HealthCheckResponse_ServingStatus.SERVING).toBe(1);
        expect(VersionServiceClient).toBeTypeOf("function");
        expect(WaitForPartyHostingRequest).toBeTypeOf("function");
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
        expect(ConnectedSynchronizerStatus).toBeTypeOf("function");
        expect(ParticipantNodeStatus).toBeTypeOf("function");
        expect(TopologyBaseQuery).toBeTypeOf("function");
        expect(TopologyBaseResult).toBeTypeOf("function");
        expect(TopologyMappingResult).toBeTypeOf("function");
        expect(TopologyStoreId).toBeTypeOf("function");
        expect(TopologySignatureFormat.ed25519).toBe("ed25519");
        expect(TopologyTransactionSignature).toBeTypeOf("function");
        expect(MultiTopologyTransactionSignature).toBeTypeOf("function");
        expect(SignedTopologyTransaction).toBeTypeOf("function");
        expect(GeneratedTopologyTransaction).toBeTypeOf("function");
        expect(PreparedTopologyTransaction).toBeTypeOf("function");
        expect(ExternalTopologySignature).toBeTypeOf("function");
        expect(TopologyMappingOperation.addReplace).toBe("addReplace");
        expect(TopologyMappingCode.partyToParticipant).toBe(
            "partyToParticipant",
        );
        expect(ParticipantPermission.submission).toBe("submission");
        expect(PartyToParticipant).toBeTypeOf("function");
        expect(TopologyTransactions).toBeTypeOf("function");
        expect(AssembleSignedTopologyTransactionsRequest).toBeTypeOf(
            "function",
        );
        expect(ExternalPartySigningPublicKey).toBeTypeOf("function");
        expect(ExternalPartySignature).toBeTypeOf("function");
        expect(ExternalPartyOnboardingTransaction).toBeTypeOf("function");
        expect(ExternalPartyCryptoKeyFormat.raw).toBe("raw");
        expect(ExternalPartySigningKeySpec.ecCurve25519).toBe(
            "ecCurve25519",
        );
        expect(ExternalPartySignatureFormat.concat).toBe("concat");
        expect(ExternalPartySigningAlgorithmSpec.ed25519).toBe("ed25519");

        const listPackagesRequest = new ListPackagesRequest();

        const getLedgerApiVersionRequest =
            ledgerApi.GetLedgerApiVersionRequest.create();

        const healthCheckRequest = grpcHealth.HealthCheckRequest.create({
            service: "",
        });

        const getParticipantStatusRequest = ParticipantStatusRequest.create();

        const getParticipantIdRequest =
            ledgerApi.admin.GetParticipantIdRequest.create();

        const getPackageContentsRequest = GetPackageContentsRequest.create({
            packageId: "pkg-1",
        });

        const getPackageReferencesRequest = GetPackageReferencesRequest.create({
            packageId: "pkg-1",
        });

        const getPackageRequest = new GetPackageRequest({ packageId: "pkg-1" });

        const getPackageStatusRequest = new GetPackageStatusRequest({
            packageId: "pkg-1",
        });

        const listVettedPackagesRequest = new ListVettedPackagesRequest();

        const participantListPackagesRequest = ParticipantListPackagesRequest.create({
            limit: 25,
        });

        const getParticipantStatusResponse = ParticipantStatusResponse.create({
            kind: {
                oneofKind: "status",
                status: {
                    active: true,
                    connectedSynchronizers: [{
                        physicalSynchronizerId: "sync::sandbox",
                        health: participantAdmin.ConnectedSynchronizer_Health.HEALTHY,
                    }],
                    supportedProtocolVersions: [30],
                },
            },
        });

        expect(listPackagesRequest).toBeInstanceOf(ListPackagesRequest);
        expect(getLedgerApiVersionRequest).toEqual({});
        expect(healthCheckRequest).toEqual({ service: "" });
        expect(getParticipantStatusRequest).toEqual({});
        expect(getParticipantIdRequest).toEqual({});
        expect(getPackageContentsRequest.packageId).toBe("pkg-1");
        expect(getPackageReferencesRequest.packageId).toBe("pkg-1");
        expect(getPackageRequest.packageId).toBe("pkg-1");
        expect(getPackageStatusRequest.packageId).toBe("pkg-1");
        expect(listVettedPackagesRequest).toBeInstanceOf(
            ListVettedPackagesRequest,
        );
        expect(participantListPackagesRequest.limit).toBe(25);
        expect(getParticipantStatusResponse).toMatchObject({
            kind: {
                oneofKind: "status",
                status: {
                    active: true,
                    supportedProtocolVersions: [30],
                },
            },
        });
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
            ParticipantListPackagesResponse.create({
                packageDescriptions: [],
            }),
        ).toEqual(ParticipantListPackagesResponse.create({ packageDescriptions: [] }));
        expect(
            GetPackageContentsResponse.create({
                modules: [],
                isUtilityPackage: false,
                languageVersion: "2.dev",
            }),
        ).toEqual(GetPackageContentsResponse.create({
            modules: [],
            isUtilityPackage: false,
            languageVersion: "2.dev",
        }));
        expect(
            GetPackageReferencesResponse.create({
                dars: [],
            }),
        ).toEqual(GetPackageReferencesResponse.create({ dars: [] }));
        expect(
            ParticipantPackageDescription.create({
                packageId: "pkg-1",
                name: "Main",
                version: "1.0.0",
                size: 42,
            }),
        ).toEqual(ParticipantPackageDescription.create({
            packageId: "pkg-1",
            name: "Main",
            version: "1.0.0",
            size: 42,
        }));
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
        expect(sdkModule).not.toHaveProperty("LedgerReplayDebuggerClient");
        expect(sdkModule).not.toHaveProperty("GetLedgerApiVersionResponse");
        expect(sdkModule).not.toHaveProperty("HealthCheckRequest");
        expect(sdkModule).not.toHaveProperty("GetParticipantStatusRequest");
        expect(sdkModule).not.toHaveProperty("GetParticipantIdRequest");
        expect(sdkModule).not.toHaveProperty("GetPackageReferencesRequest");
        expect(sdkModule).not.toHaveProperty("HealthCheckResponse");
        expect(sdkModule).not.toHaveProperty("GetLedgerApiVersionRequest");
        expect(sdkModule).not.toHaveProperty("GetParticipantStatusResponse");
        expect(sdkModule).not.toHaveProperty("GetParticipantIdResponse");
        expect(sdkModule).not.toHaveProperty("GetPackageReferencesResponse");
        expect(sdkModule).not.toHaveProperty("HealthCheckStatus");
    });
});
