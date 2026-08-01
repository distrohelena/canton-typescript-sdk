import { describe, expect, it, vi } from "vitest";
import {
    ListPartyToParticipantRequest,
    ListKeyOwnersRequest,
    RequestOptions,
    TopologyBaseQuery,
    TopologyListPartiesRequest,
    TopologyStoreId,
    TopologyStoreKind,
    TopologyStoreSynchronizer,
} from "../../../src";
import { TransportError } from "../../../src/core/errors/transport-error.js";
import { GrpcTransport } from "../../../src/transports/grpc/grpc-transport.js";
import { Enums_ParticipantPermission } from "../../../src/transports/grpc/generated/canton/com/digitalasset/canton/protocol/v30/topology.js";
import {
    ListAllV2Request,
    ListAllV2Response,
    ListAvailableStoresRequest,
    ListAvailableStoresResponse,
} from "../../../src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.js";

describe("GrpcTransport topology services", () => {
    it("forwards generated topology store messages without mapping", async () => {
        const rawResponse = ListAvailableStoresResponse.create({
            storeIds: [
                {
                    store: {
                        oneofKind: "authorized",
                        authorized: {},
                    },
                },
            ],
        });

        const listAvailableStoresAsync = vi.fn(async () => rawResponse);

        const transport = new GrpcTransport({
            getHealthAsync: async () => ({ version: "3.4.0", features: {} }),
            checkHealthAsync: async () => ({ status: 1 }),
            createPartyAsync: async () => ({ identifier: "unused" }),
            listPartiesAsync: async () => ({ partyDetails: [], nextPageToken: "" }),
            grantUserRightsAsync: async () => ({ rights: [] }),
            uploadPackageAsync: async () => ({ packageId: "unused" }),
            listAvailableStoresAsync,
            queryContractsAsync: async () => ({ activeContracts: [] }),
            getUpdatesAsync: async () => [],
            submitCommandAsync: async () => ({
                updateId: "unused",
                completionOffset: "0",
            }),
        } as any);

        const request = ListAvailableStoresRequest.create();

        const result = await transport.listAvailableStoresAsync(
            request,
            new RequestOptions({
                timeoutMs: 2_500,
            }),
        );

        expect(listAvailableStoresAsync).toHaveBeenCalledWith(
            request,
            expect.any(RequestOptions),
        );
        expect(result).toBe(rawResponse);
    });

    it("forwards generated topology list-all-v2 messages without mapping", async () => {
        const rawResponse = ListAllV2Response.create({
            result: {
                items: [{ transaction: new Uint8Array([1, 2, 3]) }],
            },
        });

        const listAllV2Async = vi.fn(async () => rawResponse);

        const transport = new GrpcTransport({
            getHealthAsync: async () => ({ version: "3.4.0", features: {} }),
            checkHealthAsync: async () => ({ status: 1 }),
            createPartyAsync: async () => ({ identifier: "unused" }),
            listPartiesAsync: async () => ({ partyDetails: [], nextPageToken: "" }),
            grantUserRightsAsync: async () => ({ rights: [] }),
            uploadPackageAsync: async () => ({ packageId: "unused" }),
            listAllV2Async,
            queryContractsAsync: async () => ({ activeContracts: [] }),
            getUpdatesAsync: async () => [],
            submitCommandAsync: async () => ({
                updateId: "unused",
                completionOffset: "0",
            }),
        } as any);

        const request = ListAllV2Request.create();

        const result = await transport.listAllV2Async(request);

        expect(listAllV2Async).toHaveBeenCalledWith(request, undefined);
        expect(result).toBe(rawResponse);
    });

    it("maps topology aggregation service responses", async () => {
        const topologyListPartiesAsync = vi.fn(async () => ({
            results: [
                {
                    party: "Alice",
                    participants: [],
                },
            ],
        }));

        const listKeyOwnersAsync = vi.fn(async () => ({
            results: [
                {
                    synchronizerId: "sync::sandbox",
                    keyOwner: "participant::sandbox",
                    signingKeys: [],
                    encryptionKeys: [],
                    physicalSynchronizerId: "sync-physical",
                },
            ],
        }));

        const transport = new GrpcTransport({
            getHealthAsync: async () => ({ version: "3.4.0", features: {} }),
            checkHealthAsync: async () => ({ status: 1 }),
            createPartyAsync: async () => ({ identifier: "unused" }),
            listPartiesAsync: async () => ({ partyDetails: [], nextPageToken: "" }),
            grantUserRightsAsync: async () => ({ rights: [] }),
            uploadPackageAsync: async () => ({ packageId: "unused" }),
            topologyListPartiesAsync,
            listKeyOwnersAsync,
            queryContractsAsync: async () => ({ activeContracts: [] }),
            getUpdatesAsync: async () => [],
            submitCommandAsync: async () => ({
                updateId: "unused",
                completionOffset: "0",
            }),
        } as any);

        const parties = await transport.topologyListPartiesAsync(
            new TopologyListPartiesRequest({
                filterParty: "Alice",
            }),
        );

        const owners = await transport.listKeyOwnersAsync(
            new ListKeyOwnersRequest({
                filterKeyOwnerUid: "participant::sandbox",
            }),
        );

        expect(topologyListPartiesAsync).toHaveBeenCalledWith(
            expect.objectContaining({
                filterParty: "Alice",
            }),
            undefined,
        );
        expect(listKeyOwnersAsync).toHaveBeenCalledWith(
            expect.objectContaining({
                filterKeyOwnerUid: "participant::sandbox",
            }),
            undefined,
        );
        expect(parties.results[0].party).toBe("Alice");
        expect(owners.results[0].keyOwner).toBe("participant::sandbox");
    });

    it("maps public party-to-participant requests and responses", async () => {
        const listPartyToParticipantAsync = vi.fn(async () => ({
            results: [
                {
                    context: {
                        serial: 7,
                        validFrom: { seconds: "1710000000", nanos: 0 },
                        validUntil: { seconds: "1710003600", nanos: 0 },
                    },
                    item: {
                        party: "Alice",
                        threshold: 1,
                        participants: [
                            {
                                participantUid: "participant::sandbox",
                                permission: Enums_ParticipantPermission.SUBMISSION,
                            },
                        ],
                    },
                },
            ],
        }));

        const transport = new GrpcTransport({
            getHealthAsync: async () => ({ version: "3.4.0", features: {} }),
            checkHealthAsync: async () => ({ status: 1 }),
            createPartyAsync: async () => ({ identifier: "unused" }),
            listPartiesAsync: async () => ({ partyDetails: [], nextPageToken: "" }),
            grantUserRightsAsync: async () => ({ rights: [] }),
            uploadPackageAsync: async () => ({ packageId: "unused" }),
            listPartyToParticipantAsync,
            queryContractsAsync: async () => ({ activeContracts: [] }),
            getUpdatesAsync: async () => [],
            submitCommandAsync: async () => ({ updateId: "unused" }),
        } as any);

        const request = new ListPartyToParticipantRequest({
            baseQuery: new TopologyBaseQuery({
                headState: true,
                storeId: new TopologyStoreId({
                    kind: TopologyStoreKind.synchronizer,
                    synchronizer: new TopologyStoreSynchronizer({ id: "sync::sandbox" }),
                }),
            }),
            filterParty: "Alice",
        });

        const response = await transport.listPartyToParticipantAsync(request);

        expect(listPartyToParticipantAsync).toHaveBeenCalledWith(
            expect.objectContaining({
                filterParty: "Alice",
                baseQuery: expect.objectContaining({
                    timeQuery: { oneofKind: "headState", headState: {} },
                    store: {
                        store: {
                            oneofKind: "synchronizer",
                            synchronizer: {
                                kind: {
                                    oneofKind: "id",
                                    id: "sync::sandbox",
                                },
                            },
                        },
                    },
                }),
            }),
            undefined,
        );
        expect(response.results[0].item).toMatchObject({
            party: "Alice",
            threshold: 1,
            participants: [
                {
                    participantUid: "participant::sandbox",
                    permission: "submission",
                },
            ],
        });
        expect(response.results[0].context?.serial).toBe(7);
        expect(response.results[0].context?.validFrom).toEqual(
            new Date("2024-03-09T16:00:00.000Z"),
        );
        expect(response.results[0].context?.validUntil).toEqual(
            new Date("2024-03-09T17:00:00.000Z"),
        );
    });

    it("wraps raw topology party mapping protobuf decode failures with an actionable transport error", async () => {
        const listPartyToParticipantAsync = vi.fn(async () => {
            throw new Error(
                "PROTO_DESERIALIZATION_FAILURE(8,0): Deserialization of protobuf message failed",
            );
        });

        const listPartyToKeyMappingAsync = vi.fn(async () => {
            throw new Error(
                "PROTO_DESERIALIZATION_FAILURE(8,0): Deserialization of protobuf message failed",
            );
        });

        const transport = new GrpcTransport({
            getHealthAsync: async () => ({ version: "3.4.0", features: {} }),
            checkHealthAsync: async () => ({ status: 1 }),
            createPartyAsync: async () => ({ identifier: "unused" }),
            listPartiesAsync: async () => ({ partyDetails: [], nextPageToken: "" }),
            grantUserRightsAsync: async () => ({ rights: [] }),
            uploadPackageAsync: async () => ({ packageId: "unused" }),
            listPartyToParticipantAsync,
            listPartyToKeyMappingAsync,
            queryContractsAsync: async () => ({ activeContracts: [] }),
            getUpdatesAsync: async () => [],
            submitCommandAsync: async () => ({
                updateId: "unused",
                completionOffset: "0",
            }),
        } as any);

        await expect(
            transport.listPartyToParticipantAsync(
                new ListPartyToParticipantRequest({ filterParty: "Alice" }),
            ),
        ).rejects.toThrow(TransportError);

        await expect(
            transport.listPartyToParticipantAsync(
                new ListPartyToParticipantRequest({ filterParty: "Alice" }),
            ),
        ).rejects.toThrow(/topologyManagerReadService\.listPartyToParticipantAsync/i);

        await expect(
            transport.listPartyToKeyMappingAsync({
                filterParty: "Alice",
            } as any),
        ).rejects.toThrow(/topologyAggregationService\.listPartiesAsync/i);

        await expect(
            transport.listPartyToKeyMappingAsync({
                filterParty: "Alice",
            } as any),
        ).rejects.toThrow(/topologyAggregationService\.listKeyOwnersAsync/i);
    });
});
