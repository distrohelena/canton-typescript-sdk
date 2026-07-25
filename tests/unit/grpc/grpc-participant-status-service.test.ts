import { describe, expect, it, vi } from "vitest";
import { RequestOptions } from "../../../src";
import { GrpcTransport } from "../../../src/transports/grpc/grpc-transport.js";
import { ConnectedSynchronizer_Health, ParticipantStatusRequest } from "../../../src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/participant_status_service.js";
import { NotInitialized_WaitingForExternalInput } from "../../../src/transports/grpc/generated/canton/com/digitalasset/canton/admin/health/v30/status_service.js";

describe("GrpcTransport participant status service", () => {
    it("maps participant status responses", async () => {
        const getParticipantStatusAsync = vi.fn(async () => ({
            kind: {
                oneofKind: "status",
                status: {
                    commonStatus: {
                        uid: "participant::sandbox",
                        uptime: {
                            seconds: "15",
                            nanos: 7,
                        },
                        ports: {
                            public: 6865,
                        },
                        active: false,
                        topologyQueues: {
                            manager: 1,
                            dispatcher: 2,
                            clients: 3,
                        },
                        components: [
                            {
                                name: "database",
                                status: {
                                    oneofKind: "ok",
                                    ok: {
                                        description: "ready",
                                    },
                                },
                            },
                        ],
                        version: "3.4.0",
                    },
                    connectedSynchronizers: [
                        {
                            physicalSynchronizerId: "sync::sandbox",
                            health: ConnectedSynchronizer_Health.HEALTHY,
                        },
                    ],
                    active: true,
                    supportedProtocolVersions: [30],
                },
            },
        }));

        const transport = new GrpcTransport({
            getHealthAsync: async () => ({
                version: "3.4.0",
                features: {},
            }),
            checkHealthAsync: async () => ({ status: 1 }),
            createPartyAsync: async () => ({ identifier: "unused" }),
            listPartiesAsync: async () => ({
                partyDetails: [],
                nextPageToken: "",
            }),
            grantUserRightsAsync: async () => ({ rights: [] }),
            uploadPackageAsync: async () => ({ packageId: "unused" }),
            getParticipantStatusAsync,
            queryContractsAsync: async () => ({ activeContracts: [] }),
            getUpdatesAsync: async () => [],
            submitCommandAsync: async () => ({
                updateId: "unused",
                completionOffset: "0",
            }),
        } as any);

        const result = await transport.getParticipantStatusAsync(
            ParticipantStatusRequest.create(),
            new RequestOptions({
                timeoutMs: 2_500,
            }),
        );

        expect(getParticipantStatusAsync).toHaveBeenLastCalledWith(
            {},
            expect.any(RequestOptions),
        );
        expect(result.kind.oneofKind).toBe("status");
        expect(result.kind.status.commonStatus?.uid).toBe("participant::sandbox");
        expect(result.kind.status.active).toBe(true);
        expect(result.kind.status.commonStatus?.uptime).toEqual({
            seconds: "15",
            nanos: 7,
        });
        expect(result.kind.status.connectedSynchronizers[0].health).toBe(
            ConnectedSynchronizer_Health.HEALTHY,
        );
        expect(result.kind.status.supportedProtocolVersions).toEqual([30]);
        expect(result.kind.status.commonStatus?.components[0]).toMatchObject({
            name: "database",
            status: {
                oneofKind: "ok",
                ok: { description: "ready" },
            },
        });
    });

    it("maps not-initialized participant status responses", async () => {
        const getParticipantStatusAsync = vi.fn(async () => ({
            kind: {
                oneofKind: "notInitialized",
                notInitialized: {
                    active: false,
                    waitingForExternalInput:
                        NotInitialized_WaitingForExternalInput.ID,
                    version: "3.4.0",
                },
            },
        }));

        const transport = new GrpcTransport({
            getHealthAsync: async () => ({
                version: "3.4.0",
                features: {},
            }),
            checkHealthAsync: async () => ({ status: 1 }),
            createPartyAsync: async () => ({ identifier: "unused" }),
            listPartiesAsync: async () => ({
                partyDetails: [],
                nextPageToken: "",
            }),
            grantUserRightsAsync: async () => ({ rights: [] }),
            uploadPackageAsync: async () => ({ packageId: "unused" }),
            getParticipantStatusAsync,
            queryContractsAsync: async () => ({ activeContracts: [] }),
            getUpdatesAsync: async () => [],
            submitCommandAsync: async () => ({
                updateId: "unused",
                completionOffset: "0",
            }),
        } as any);

        const result = await transport.getParticipantStatusAsync(
            ParticipantStatusRequest.create(),
        );

        expect(result.kind.oneofKind).toBe("notInitialized");
        expect(result.kind.notInitialized.active).toBe(false);
        expect(result.kind.notInitialized.waitingForExternalInput).toBe(
            NotInitialized_WaitingForExternalInput.ID,
        );
        expect(result.kind.notInitialized.version).toBe("3.4.0");
    });
});
