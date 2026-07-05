import { describe, expect, it, vi } from "vitest";
import {
    AdminNotInitializedExternalInputKind,
    ConnectedSynchronizerHealth,
    GetParticipantStatusRequest,
    RequestOptions,
} from "../../../src";
import { GrpcTransport } from "../../../src/transports/grpc/grpc-transport.js";
import { ConnectedSynchronizer_Health } from "../../../src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/participant_status_service.js";
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
            streamTransactionsAsync: async () => [],
            submitCommandAsync: async () => ({
                updateId: "unused",
                completionOffset: "0",
            }),
        } as any);

        const result = await transport.getParticipantStatusAsync(
            new GetParticipantStatusRequest(),
            new RequestOptions({
                timeoutMs: 2_500,
            }),
        );

        expect(getParticipantStatusAsync).toHaveBeenLastCalledWith(
            {},
            expect.any(RequestOptions),
        );
        expect(result.status?.uid).toBe("participant::sandbox");
        expect(result.status?.active).toBe(true);
        expect(result.status?.uptime).toEqual({
            seconds: "15",
            nanos: 7,
        });
        expect(result.status?.connectedSynchronizers[0].health).toBe(
            ConnectedSynchronizerHealth.healthy,
        );
        expect(result.status?.supportedProtocolVersions).toEqual([30]);
        expect(result.status?.components[0]).toMatchObject({
            name: "database",
            kind: "ok",
            description: "ready",
        });
        expect(result.notInitialized).toBeUndefined();
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
            streamTransactionsAsync: async () => [],
            submitCommandAsync: async () => ({
                updateId: "unused",
                completionOffset: "0",
            }),
        } as any);

        const result = await transport.getParticipantStatusAsync(
            new GetParticipantStatusRequest(),
        );

        expect(result.status).toBeUndefined();
        expect(result.notInitialized?.active).toBe(false);
        expect(result.notInitialized?.waitingForExternalInput).toBe(
            AdminNotInitializedExternalInputKind.id,
        );
        expect(result.notInitialized?.version).toBe("3.4.0");
    });
});
