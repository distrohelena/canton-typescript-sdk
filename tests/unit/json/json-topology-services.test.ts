import { describe, expect, it } from "vitest";
import {
    CantonClient,
    CantonClientOptions,
    ListAllRequest,
    ListAllV2Request,
    ListAvailableStoresRequest,
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
    TopologyListPartiesRequest,
    TopologyListVettedPackagesRequest,
    TransportKind,
} from "../../../src";

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
                        new ListAvailableStoresRequest(),
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
                        new ListAllV2Request(),
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
});
