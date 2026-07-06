import { describe, expect, it, vi } from "vitest";
import {
    ListAvailableStoresRequest,
    ListKeyOwnersRequest,
    RequestOptions,
    TopologyListPartiesRequest,
} from "../../../src";
import { GrpcTransport } from "../../../src/transports/grpc/grpc-transport.js";

describe("GrpcTransport topology services", () => {
    it("maps topology manager read service responses", async () => {
        const listAvailableStoresAsync = vi.fn(async () => ({
            storeIds: [
                {
                    store: {
                        oneofKind: "authorized",
                        authorized: {},
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
            listAvailableStoresAsync,
            queryContractsAsync: async () => ({ activeContracts: [] }),
            streamTransactionsAsync: async () => [],
            submitCommandAsync: async () => ({
                updateId: "unused",
                completionOffset: "0",
            }),
        } as any);

        const result = await transport.listAvailableStoresAsync(
            new ListAvailableStoresRequest(),
            new RequestOptions({
                timeoutMs: 2_500,
            }),
        );

        expect(listAvailableStoresAsync).toHaveBeenCalledWith(
            {},
            expect.any(RequestOptions),
        );
        expect(result.storeIds[0].kind).toBe("authorized");
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
            streamTransactionsAsync: async () => [],
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
});
