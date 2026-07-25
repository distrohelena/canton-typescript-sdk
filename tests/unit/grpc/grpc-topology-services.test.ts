import { describe, expect, it, vi } from "vitest";
import {
    ListKeyOwnersRequest,
    RequestOptions,
    TopologyListPartiesRequest,
} from "../../../src";
import { TransportError } from "../../../src/core/errors/transport-error.js";
import { GrpcTransport } from "../../../src/transports/grpc/grpc-transport.js";
import {
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
            transport.listPartyToParticipantAsync({
                filterParty: "Alice",
            } as any),
        ).rejects.toThrow(TransportError);

        await expect(
            transport.listPartyToParticipantAsync({
                filterParty: "Alice",
            } as any),
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
