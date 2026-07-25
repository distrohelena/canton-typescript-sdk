import { describe, expect, it } from "vitest";
import {
    AddTopologyTransactionsRequest,
    AssembleSignedTopologyTransactionsRequest,
    AuthorizeTopologyTransactionsRequest,
    CantonClient,
    CantonClientOptions,
    GenerateTopologyTransactionsRequest,
    ImportTopologySnapshotRequest,
    ImportTopologySnapshotV2Request,
    ListAllRequest,
    ListDecentralizedNamespaceDefinitionRequest,
    ListKeyOwnersRequest,
    ListLsuAnnouncementRequest,
    ListLsuSequencerConnectionSuccessorRequest,
    ListMediatorSynchronizerStateRequest,
    ListNamespaceDelegationRequest,
    ListOwnerToKeyMappingRequest,
    ListParticipantSynchronizerPermissionRequest,
    ListPartyHostingLimitsRequest,
    ListPartyToKeyMappingRequest,
    ListPartyToParticipantRequest,
    ListSequencerSynchronizerStateRequest,
    ListSequencingParametersStateRequest,
    ListSynchronizerParametersStateRequest,
    ListSynchronizerTrustCertificateRequest,
    NotSupportedError,
    SignTopologyTransactionsRequest,
    TopologyListPartiesRequest,
    TopologyListVettedPackagesRequest,
    TransportKind,
} from "../../../src";
import {
    CreateTemporaryTopologyStoreRequest,
    DropTemporaryTopologyStoreRequest,
} from "../../../src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_write_service.js";
import {
    ListAllV2Request,
    ListAvailableStoresRequest,
} from "../../../src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.js";

describe("Topology services with JSON transport", () => {
    it("rejects topology manager read methods on JSON", async () => {
        const client = new CantonClient(
            new CantonClientOptions({
                transportKind: TransportKind.json,
                ledgerEndpoint: "https://ledger.example.com",
                participantAdminEndpoint: "https://participant-admin.example.com",
            }),
        );

        const calls = [
            [
                "TopologyManagerReadService.ListNamespaceDelegation",
                () =>
                    client.topologyManagerReadService.listNamespaceDelegationAsync(
                        new ListNamespaceDelegationRequest(),
                    ),
            ],
            [
                "TopologyManagerReadService.ListDecentralizedNamespaceDefinition",
                () =>
                    client.topologyManagerReadService.listDecentralizedNamespaceDefinitionAsync(
                        new ListDecentralizedNamespaceDefinitionRequest(),
                    ),
            ],
            [
                "TopologyManagerReadService.ListOwnerToKeyMapping",
                () =>
                    client.topologyManagerReadService.listOwnerToKeyMappingAsync(
                        new ListOwnerToKeyMappingRequest(),
                    ),
            ],
            [
                "TopologyManagerReadService.ListPartyToKeyMapping",
                () =>
                    client.topologyManagerReadService.listPartyToKeyMappingAsync(
                        new ListPartyToKeyMappingRequest(),
                    ),
            ],
            [
                "TopologyManagerReadService.ListSynchronizerTrustCertificate",
                () =>
                    client.topologyManagerReadService.listSynchronizerTrustCertificateAsync(
                        new ListSynchronizerTrustCertificateRequest(),
                    ),
            ],
            [
                "TopologyManagerReadService.ListParticipantSynchronizerPermission",
                () =>
                    client.topologyManagerReadService.listParticipantSynchronizerPermissionAsync(
                        new ListParticipantSynchronizerPermissionRequest(),
                    ),
            ],
            [
                "TopologyManagerReadService.ListPartyHostingLimits",
                () =>
                    client.topologyManagerReadService.listPartyHostingLimitsAsync(
                        new ListPartyHostingLimitsRequest(),
                    ),
            ],
            [
                "TopologyManagerReadService.ListVettedPackages",
                () =>
                    client.topologyManagerReadService.listVettedPackagesAsync(
                        new TopologyListVettedPackagesRequest(),
                    ),
            ],
            [
                "TopologyManagerReadService.ListPartyToParticipant",
                () =>
                    client.topologyManagerReadService.listPartyToParticipantAsync(
                        new ListPartyToParticipantRequest(),
                    ),
            ],
            [
                "TopologyManagerReadService.ListSynchronizerParametersState",
                () =>
                    client.topologyManagerReadService.listSynchronizerParametersStateAsync(
                        new ListSynchronizerParametersStateRequest(),
                    ),
            ],
            [
                "TopologyManagerReadService.ListSequencingParametersState",
                () =>
                    client.topologyManagerReadService.listSequencingParametersStateAsync(
                        new ListSequencingParametersStateRequest(),
                    ),
            ],
            [
                "TopologyManagerReadService.ListMediatorSynchronizerState",
                () =>
                    client.topologyManagerReadService.listMediatorSynchronizerStateAsync(
                        new ListMediatorSynchronizerStateRequest(),
                    ),
            ],
            [
                "TopologyManagerReadService.ListSequencerSynchronizerState",
                () =>
                    client.topologyManagerReadService.listSequencerSynchronizerStateAsync(
                        new ListSequencerSynchronizerStateRequest(),
                    ),
            ],
            [
                "TopologyManagerReadService.ListLsuAnnouncement",
                () =>
                    client.topologyManagerReadService.listLsuAnnouncementAsync(
                        new ListLsuAnnouncementRequest(),
                    ),
            ],
            [
                "TopologyManagerReadService.ListLsuSequencerConnectionSuccessor",
                () =>
                    client.topologyManagerReadService.listLsuSequencerConnectionSuccessorAsync(
                        new ListLsuSequencerConnectionSuccessorRequest(),
                    ),
            ],
            [
                "TopologyManagerReadService.ListAvailableStores",
                () =>
                    client.topologyManagerReadService.listAvailableStoresAsync(
                        ListAvailableStoresRequest.create(),
                    ),
            ],
            [
                "TopologyManagerReadService.ListAll",
                () =>
                    client.topologyManagerReadService.listAllAsync(
                        new ListAllRequest(),
                    ),
            ],
            [
                "TopologyManagerReadService.ListAllV2",
                () =>
                    client.topologyManagerReadService.listAllV2Async(
                        ListAllV2Request.create(),
                    ),
            ],
        ] as const;

        for (const [message, invoke] of calls) {
            await expect(invoke()).rejects.toThrow(NotSupportedError);
            await expect(invoke()).rejects.toThrow(message);
        }
    });

    it("rejects topology aggregation methods on JSON", async () => {
        const client = new CantonClient(
            new CantonClientOptions({
                transportKind: TransportKind.json,
                ledgerEndpoint: "https://ledger.example.com",
                participantAdminEndpoint: "https://participant-admin.example.com",
            }),
        );

        const calls = [
            [
                "TopologyAggregationService.ListParties",
                () =>
                    client.topologyAggregationService.listPartiesAsync(
                        new TopologyListPartiesRequest(),
                    ),
            ],
            [
                "TopologyAggregationService.ListKeyOwners",
                () =>
                    client.topologyAggregationService.listKeyOwnersAsync(
                        new ListKeyOwnersRequest(),
                    ),
            ],
        ] as const;

        for (const [message, invoke] of calls) {
            await expect(invoke()).rejects.toThrow(NotSupportedError);
            await expect(invoke()).rejects.toThrow(message);
        }
    });

    it("rejects topology manager write RPCs on JSON and keeps assembly local", async () => {
        const client = new CantonClient(
            new CantonClientOptions({
                transportKind: TransportKind.json,
                ledgerEndpoint: "https://ledger.example.com",
                participantAdminEndpoint: "https://participant-admin.example.com",
            }),
        );

        const calls = [
            [
                "TopologyManagerWriteService.Authorize",
                () =>
                    client.topologyManagerWriteService.authorizeAsync(
                        new AuthorizeTopologyTransactionsRequest(),
                    ),
            ],
            [
                "TopologyManagerWriteService.AddTransactions",
                () =>
                    client.topologyManagerWriteService.addTransactionsAsync(
                        new AddTopologyTransactionsRequest(),
                    ),
            ],
            [
                "TopologyManagerWriteService.ImportTopologySnapshot",
                () =>
                    client.topologyManagerWriteService.importTopologySnapshotAsync(
                        new ImportTopologySnapshotRequest(),
                    ),
            ],
            [
                "TopologyManagerWriteService.ImportTopologySnapshotV2",
                () =>
                    client.topologyManagerWriteService.importTopologySnapshotV2Async(
                        new ImportTopologySnapshotV2Request(),
                    ),
            ],
            [
                "TopologyManagerWriteService.SignTransactions",
                () =>
                    client.topologyManagerWriteService.signTransactionsAsync(
                        new SignTopologyTransactionsRequest(),
                    ),
            ],
            [
                "TopologyManagerWriteService.GenerateTransactions",
                () =>
                    client.topologyManagerWriteService.generateTransactionsAsync(
                        new GenerateTopologyTransactionsRequest(),
                    ),
            ],
            [
                "TopologyManagerWriteService.CreateTemporaryTopologyStore",
                () =>
                    client.topologyManagerWriteService.createTemporaryTopologyStoreAsync(
                        CreateTemporaryTopologyStoreRequest.create(),
                    ),
            ],
            [
                "TopologyManagerWriteService.DropTemporaryTopologyStore",
                () =>
                    client.topologyManagerWriteService.dropTemporaryTopologyStoreAsync(
                        DropTemporaryTopologyStoreRequest.create(),
                    ),
            ],
        ] as const;

        for (const [message, invoke] of calls) {
            await expect(invoke()).rejects.toThrow(NotSupportedError);
            await expect(invoke()).rejects.toThrow(message);
        }

        expect(
            client.topologyManagerWriteService.assembleSignedTransactions(
                new AssembleSignedTopologyTransactionsRequest(),
            ),
        ).toEqual([]);
    });
});
