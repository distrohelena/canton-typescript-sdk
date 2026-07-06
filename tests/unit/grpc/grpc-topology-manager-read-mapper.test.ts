import { describe, expect, it } from "vitest";
import {
    ListAvailableStoresRequest,
    ListAllV2Request,
    ListPartyToParticipantRequest,
    PartyToParticipant,
    ParticipantPermission,
    TopologyBaseQuery,
    TopologyMappingOperation,
    TopologyStoreId,
    TopologyStoreKind,
    TopologyTransactions,
} from "../../../src";
import {
    mapGrpcListAllV2Response,
    mapGrpcListAvailableStoresResponse,
    mapGrpcListPartyToParticipantRequest,
    mapGrpcListPartyToParticipantResponse,
    mapGrpcTopologyBaseQuery,
    mapGrpcTopologyBaseResult,
} from "../../../src/transports/grpc/mappers/topology-manager-read-mapper.js";

describe("gRPC topology manager read mappers", () => {
    it("maps topology base queries", () => {
        const result = mapGrpcTopologyBaseQuery(
            new TopologyBaseQuery({
                storeId: new TopologyStoreId({
                    kind: TopologyStoreKind.authorized,
                }),
                includeProposals: false,
                operation: TopologyMappingOperation.addReplace,
                headState: true,
                signedKeyFingerprint: "fingerprint-1",
                protocolVersion: 30,
            }),
        );

        expect(result).toMatchObject({
            proposals: false,
            filterSignedKey: "fingerprint-1",
            protocolVersion: 30,
        });
        expect(result.timeQuery.oneofKind).toBe("headState");
    });

    it("maps party-to-participant requests", () => {
        const result = mapGrpcListPartyToParticipantRequest(
            new ListPartyToParticipantRequest({
                baseQuery: new TopologyBaseQuery({
                    includeProposals: false,
                    operation: TopologyMappingOperation.addReplace,
                    headState: true,
                }),
                filterParty: "Alice",
                filterParticipant: "participant::sandbox",
            }),
        );

        expect(result.filterParty).toBe("Alice");
        expect(result.filterParticipant).toBe("participant::sandbox");
        expect(result.baseQuery?.timeQuery.oneofKind).toBe("headState");
    });

    it("maps topology base results and party-to-participant responses", () => {
        const response = mapGrpcListPartyToParticipantResponse({
            results: [
                {
                    context: {
                        serial: 7,
                        signedByFingerprints: ["key-1"],
                    },
                    item: {
                        party: "Alice",
                        threshold: 1,
                        participants: [
                            {
                                participantUid: "participant::sandbox",
                                permission: 1,
                            },
                        ],
                    },
                },
            ],
        });

        const context = mapGrpcTopologyBaseResult({
            serial: 7,
            signedByFingerprints: ["key-1"],
        });

        expect(context.serial).toBe(7);
        expect(response.results[0].item).toBeInstanceOf(PartyToParticipant);
        expect(response.results[0].item.participants[0].permission).toBe(
            ParticipantPermission.submission,
        );
    });

    it("maps available stores and list-all-v2 responses", () => {
        const stores = mapGrpcListAvailableStoresResponse({
            storeIds: [
                {
                    store: {
                        oneofKind: "authorized",
                        authorized: {},
                    },
                },
            ],
        });

        const transactions = mapGrpcListAllV2Response({
            result: {
                items: [
                    {
                        transaction: new Uint8Array([1, 2, 3]),
                    },
                ],
            },
        });

        expect(new ListAvailableStoresRequest()).toBeInstanceOf(
            ListAvailableStoresRequest,
        );
        expect(stores.storeIds[0].kind).toBe(TopologyStoreKind.authorized);
        expect(transactions.result).toBeInstanceOf(TopologyTransactions);
        expect(transactions.result?.items[0].transaction).toEqual(
            new Uint8Array([1, 2, 3]),
        );
        expect(
            new ListAllV2Request({
                includeMappings: [],
            }),
        ).toBeInstanceOf(ListAllV2Request);
    });
});
