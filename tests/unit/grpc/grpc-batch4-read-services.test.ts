import { describe, expect, it } from "vitest";
import {
    CountInFlightRequest,
    GetConfigForSlowCounterParticipantsRequest,
    GetIntervalsBehindForCounterParticipantsRequest,
    GetSynchronizerIdRequest,
    ListConnectedSynchronizersRequest,
    LookupOffsetByTimeRequest,
    ParticipantInspectionServiceClient,
    RequestOptions,
    SynchronizerConnectivityServiceClient,
    TopologyDuration,
} from "../../../src";
import { GrpcTransport } from "../../../src/transports/grpc/grpc-transport.js";

describe("GrpcTransport batch 4 read services", () => {
    it("maps participant inspection and synchronizer connectivity reads", async () => {
        const transport = new GrpcTransport({
            getHealthAsync: async () => ({ version: "3.4.0", features: {} }),
            checkHealthAsync: async () => ({ status: 1 }),
            createPartyAsync: async () => ({ identifier: "unused" }),
            listPartiesAsync: async () => ({ partyDetails: [], nextPageToken: "" }),
            grantUserRightsAsync: async () => ({ rights: [] }),
            uploadPackageAsync: async () => ({ packageId: "unused" }),
            queryContractsAsync: async () => ({ activeContracts: [] }),
            streamTransactionsAsync: async () => [],
            submitCommandAsync: async () => ({ updateId: "unused" }),
            lookupOffsetByTimeAsync: async () => ({
                offset: "42",
            }),
            countInFlightAsync: async () => ({
                pendingSubmissions: 2,
                pendingTransactions: 3,
            }),
            getConfigForSlowCounterParticipantsAsync: async () => ({
                configs: [
                    {
                        synchronizerIds: ["sync-1"],
                        distinguishedParticipantUids: ["participant-1"],
                        thresholdDistinguished: "4",
                        thresholdDefault: "5",
                        participantUidsMetrics: ["participant-1"],
                    },
                ],
            }),
            getIntervalsBehindForCounterParticipantsAsync: async () => ({
                intervalsBehind: [
                    {
                        counterParticipantUid: "participant-1",
                        synchronizerId: "sync-1",
                        intervalsBehind: "6",
                        behindSince: {
                            seconds: "30",
                            nanos: 0,
                        },
                        asOfSequencingTimestamp: {
                            seconds: "1735689600",
                            nanos: 0,
                        },
                    },
                ],
            }),
            listConnectedSynchronizersAsync: async () => ({
                connectedSynchronizers: [
                    {
                        synchronizerAlias: "sync-alias-1",
                        synchronizerId: "sync-1",
                        physicalSynchronizerId: "physical-sync-1",
                        healthy: true,
                    },
                ],
            }),
            getSynchronizerIdAsync: async () => ({
                synchronizerId: "sync-1",
                physicalSynchronizerId: "physical-sync-1",
            }),
        } as any);

        const options = new RequestOptions({
            timeoutMs: 1_000,
        });

        const participantInspection = new ParticipantInspectionServiceClient(
            transport,
        );

        const synchronizerConnectivity =
            new SynchronizerConnectivityServiceClient(transport);

        const offset = await participantInspection.lookupOffsetByTimeAsync(
            new LookupOffsetByTimeRequest({
                timestamp: new Date("2026-01-01T00:00:00.000Z"),
            }),
            options,
        );

        const inFlight = await participantInspection.countInFlightAsync(
            new CountInFlightRequest({
                synchronizerId: "sync-1",
            }),
            options,
        );

        const slowConfig =
            await participantInspection.getConfigForSlowCounterParticipantsAsync(
                new GetConfigForSlowCounterParticipantsRequest({
                    synchronizerIds: ["sync-1"],
                }),
                options,
            );

        const intervalsBehind =
            await participantInspection.getIntervalsBehindForCounterParticipantsAsync(
                new GetIntervalsBehindForCounterParticipantsRequest({
                    counterParticipantIds: ["participant-1"],
                    synchronizerIds: ["sync-1"],
                    threshold: "6",
                }),
                options,
            );

        const connectedSynchronizers =
            await synchronizerConnectivity.listConnectedSynchronizersAsync(
                new ListConnectedSynchronizersRequest(),
                options,
            );

        const synchronizerId =
            await synchronizerConnectivity.getSynchronizerIdAsync(
                new GetSynchronizerIdRequest({
                    synchronizerAlias: "sync-alias-1",
                }),
                options,
            );

        expect(offset.offset).toBe("42");
        expect(inFlight.pendingSubmissions).toBe(2);
        expect(slowConfig.configs[0]?.thresholdDefault).toBe("5");
        expect(intervalsBehind.intervalsBehind[0]?.behindSince).toEqual(
            new TopologyDuration({
                seconds: "30",
                nanos: 0,
            }),
        );
        expect(connectedSynchronizers.connectedSynchronizers[0]).toMatchObject({
            synchronizerAlias: "sync-alias-1",
            synchronizerId: "sync-1",
            physicalSynchronizerId: "physical-sync-1",
            healthy: true,
        });
        expect(synchronizerId.physicalSynchronizerId).toBe("physical-sync-1");
    });
});
