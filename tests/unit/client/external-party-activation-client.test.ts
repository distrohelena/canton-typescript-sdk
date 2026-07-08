import { describe, expect, it, vi } from "vitest";
import {
    AuthorizeTopologyTransactionsResponse,
    CantonClient,
    ExternalPartyActivationClient,
    ExternalPartyActivationRequest,
    ListPartyToParticipantResponse,
    ParticipantPermission,
    PartyToParticipant,
    PartyToParticipantParticipant,
    TopologyBaseResult,
    TopologyMappingOperation,
    TopologyMappingResult,
    TopologyStoreId,
    TopologyStoreKind,
    TopologyStoreSynchronizer,
} from "../../../src";

describe("ExternalPartyActivationClient", () => {
    it("authorizes additional participants and waits for the mapping to become active", async () => {
        const synchronizerId =
            "global-domain::1220453245831122dddf3742433b151767ebdd4af66c1a6a20c61a13a427e697908b";
        const transactionHash = new Uint8Array([0x12, 0x20, 0xaa, 0xbb]);
        const activeMapping = new PartyToParticipant({
            party: "ed25519_party::fingerprint",
            threshold: 2,
            participants: [
                new PartyToParticipantParticipant({
                    participantUid: "participant::primary",
                    permission: ParticipantPermission.confirmation,
                }),
                new PartyToParticipantParticipant({
                    participantUid: "participant::secondary",
                    permission: ParticipantPermission.confirmation,
                }),
            ],
        });

        let activeReads = 0;

        const primaryClient = {
            topologyManagerReadService: {
                listPartyToParticipantAsync: vi.fn(async (request) => {
                    if (request.baseQuery?.includeProposals === true) {
                        return new ListPartyToParticipantResponse({
                            results: [
                                new TopologyMappingResult({
                                    context: new TopologyBaseResult({
                                        storeId: new TopologyStoreId({
                                            kind: TopologyStoreKind.synchronizer,
                                            synchronizer:
                                                new TopologyStoreSynchronizer({
                                                    id: synchronizerId,
                                                }),
                                        }),
                                        operation:
                                            TopologyMappingOperation.addReplace,
                                        serial: 1,
                                        transactionHash,
                                        signedByFingerprints: [
                                            "participant::primary",
                                            "fingerprint",
                                        ],
                                    }),
                                    item: activeMapping,
                                }),
                            ],
                        });
                    }

                    activeReads += 1;

                    if (activeReads < 2) {
                        return new ListPartyToParticipantResponse({
                            results: [],
                        });
                    }

                    return new ListPartyToParticipantResponse({
                        results: [
                            new TopologyMappingResult({
                                context: new TopologyBaseResult({
                                    storeId: new TopologyStoreId({
                                        kind: TopologyStoreKind.synchronizer,
                                        synchronizer:
                                            new TopologyStoreSynchronizer({
                                                id: synchronizerId,
                                            }),
                                    }),
                                    operation:
                                        TopologyMappingOperation.addReplace,
                                    serial: 1,
                                    transactionHash,
                                    signedByFingerprints: [
                                        "participant::primary",
                                        "participant::secondary",
                                        "fingerprint",
                                    ],
                                }),
                                item: activeMapping,
                            }),
                        ],
                    });
                }),
            },
        } as unknown as CantonClient;

        const authorizeAsync = vi.fn(
            async () =>
                new AuthorizeTopologyTransactionsResponse(),
        );

        const secondaryClient = {
            topologyManagerWriteService: {
                authorizeAsync,
            },
        } as unknown as CantonClient;

        const client = new ExternalPartyActivationClient(primaryClient);

        const result = await client.activateAsync(
            new ExternalPartyActivationRequest({
                partyId: "ed25519_party::fingerprint",
                synchronizerId,
                authorizingClients: [secondaryClient],
                activationTimeoutMs: 50,
                pollIntervalMs: 1,
            }),
        );

        expect(authorizeAsync).toHaveBeenCalledTimes(1);
        expect(authorizeAsync).toHaveBeenCalledWith(
            expect.objectContaining({
                transactionHash: "1220aabb",
                mustFullyAuthorize: false,
                store: expect.objectContaining({
                    kind: TopologyStoreKind.synchronizer,
                    synchronizer: expect.objectContaining({
                        id: synchronizerId,
                    }),
                }),
            }),
            undefined,
        );
        expect(result.transactionHash).toBe("1220aabb");
        expect(result.mapping).toBe(activeMapping);
    });

    it("returns immediately when the mapping is already active", async () => {
        const synchronizerId = "sync-1";
        const activeMapping = new PartyToParticipant({
            party: "Alice",
            threshold: 1,
            participants: [
                new PartyToParticipantParticipant({
                    participantUid: "participant::primary",
                    permission: ParticipantPermission.confirmation,
                }),
            ],
        });

        const primaryClient = {
            topologyManagerReadService: {
                listPartyToParticipantAsync: vi.fn(async (request) => {
                    if (request.baseQuery?.includeProposals === true) {
                        return new ListPartyToParticipantResponse({
                            results: [],
                        });
                    }

                    return new ListPartyToParticipantResponse({
                        results: [
                            new TopologyMappingResult({
                                context: new TopologyBaseResult({
                                    storeId: new TopologyStoreId({
                                        kind: TopologyStoreKind.synchronizer,
                                        synchronizer:
                                            new TopologyStoreSynchronizer({
                                                id: synchronizerId,
                                            }),
                                    }),
                                    operation:
                                        TopologyMappingOperation.addReplace,
                                    serial: 1,
                                    transactionHash: new Uint8Array([0xab]),
                                }),
                                item: activeMapping,
                            }),
                        ],
                    });
                }),
            },
        } as unknown as CantonClient;

        const authorizeAsync = vi.fn();

        const secondaryClient = {
            topologyManagerWriteService: {
                authorizeAsync,
            },
        } as unknown as CantonClient;

        const client = new ExternalPartyActivationClient(primaryClient);

        const result = await client.activateAsync(
            new ExternalPartyActivationRequest({
                partyId: "Alice",
                synchronizerId,
                authorizingClients: [secondaryClient],
                activationTimeoutMs: 50,
                pollIntervalMs: 1,
            }),
        );

        expect(authorizeAsync).not.toHaveBeenCalled();
        expect(result.transactionHash).toBe("ab");
        expect(result.mapping).toBe(activeMapping);
    });
});
