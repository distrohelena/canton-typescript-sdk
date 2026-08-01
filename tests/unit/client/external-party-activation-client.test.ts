import { describe, expect, it, vi } from "vitest";
import {
    CantonClient,
    ExternalPartyActivationClient,
    ExternalPartyActivationRequest,
} from "../../../src";
import type { ListPartyToParticipantResponse } from "../../../src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.js";
import { Enums_ParticipantPermission, Enums_TopologyChangeOp } from "../../../src/transports/grpc/generated/canton/com/digitalasset/canton/protocol/v30/topology.js";
import type { PartyToParticipant } from "../../../src/transports/grpc/generated/canton/com/digitalasset/canton/protocol/v30/topology.js";

describe("ExternalPartyActivationClient", () => {
    it("authorizes additional participants and waits for the mapping to become active", async () => {
        const synchronizerId =
            "global-domain::1220453245831122dddf3742433b151767ebdd4af66c1a6a20c61a13a427e697908b";

        const transactionHash = new Uint8Array([0x12, 0x20, 0xaa, 0xbb]);

        const activeMapping: PartyToParticipant = {
            party: "ed25519_party::fingerprint",
            threshold: 2,
            participants: [
                {
                    participantUid: "participant::primary",
                    permission: Enums_ParticipantPermission.CONFIRMATION,
                },
                {
                    participantUid: "participant::secondary",
                    permission: Enums_ParticipantPermission.CONFIRMATION,
                },
            ],
        };

        let activeReads = 0;

        const primaryClient = {
            topologyManagerReadService: {
                listPartyToParticipantAsync: vi.fn(async (request) => {
                    if (request.baseQuery?.includeProposals === true) {
                        return {
                            results: [
                                {
                                    context: {
                                        operation: Enums_TopologyChangeOp.ADD_REPLACE,
                                        serial: 1,
                                        transactionHash,
                                        signedByFingerprints: ["participant::primary", "fingerprint"],
                                    },
                                    item: activeMapping,
                                },
                            ],
                        } satisfies ListPartyToParticipantResponse;
                    }

                    activeReads += 1;

                    if (activeReads < 2) {
                        return { results: [] } satisfies ListPartyToParticipantResponse;
                    }

                    return {
                        results: [
                            {
                                context: {
                                    operation: Enums_TopologyChangeOp.ADD_REPLACE,
                                    serial: 1,
                                    transactionHash,
                                    signedByFingerprints: ["participant::primary", "participant::secondary", "fingerprint"],
                                },
                                item: activeMapping,
                            },
                        ],
                    } satisfies ListPartyToParticipantResponse;
                }),
            },
        } as unknown as CantonClient;

        const authorizeAsync = vi.fn(async () => ({}));

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
        expect(
            primaryClient.topologyManagerReadService.listPartyToParticipantAsync,
        ).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({
                baseQuery: expect.objectContaining({ includeProposals: false }),
            }),
            undefined,
        );
        expect(
            primaryClient.topologyManagerReadService.listPartyToParticipantAsync,
        ).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({
                baseQuery: expect.objectContaining({ includeProposals: true }),
            }),
            undefined,
        );
        expect(authorizeAsync).toHaveBeenCalledWith(
            expect.objectContaining({
                type: {
                    oneofKind: "transactionHash",
                    transactionHash: "1220aabb",
                },
                mustFullyAuthorize: false,
                forceChanges: [],
                signedBy: [],
            }),
            undefined,
        );
        expect(result.transactionHash).toBe("1220aabb");
        expect(result.mapping).toBe(activeMapping);
    });

    it("returns immediately when the mapping is already active", async () => {
        const synchronizerId = "sync-1";

        const activeMapping: PartyToParticipant = {
            party: "Alice",
            threshold: 1,
            participants: [
                {
                    participantUid: "participant::primary",
                    permission: Enums_ParticipantPermission.CONFIRMATION,
                },
            ],
        };

        const primaryClient = {
            topologyManagerReadService: {
                listPartyToParticipantAsync: vi.fn(async (request) => {
                    if (request.baseQuery?.includeProposals === true) {
                        return { results: [] } satisfies ListPartyToParticipantResponse;
                    }

                    return {
                        results: [
                            {
                                context: {
                                    operation: Enums_TopologyChangeOp.ADD_REPLACE,
                                    serial: 1,
                                    transactionHash: new Uint8Array([0xab]),
                                    signedByFingerprints: [],
                                },
                                item: activeMapping,
                            },
                        ],
                    } satisfies ListPartyToParticipantResponse;
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
