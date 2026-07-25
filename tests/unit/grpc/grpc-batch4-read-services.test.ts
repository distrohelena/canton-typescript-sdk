import { describe, expect, it } from "vitest";
import {
    CountInFlightRequest,
    GetConfigForSlowCounterParticipantsRequest,
    GetIntervalsBehindForCounterParticipantsRequest,
    ParticipantInspectionServiceClient,
    RequestOptions,
    SynchronizerConnectivityServiceClient,
    TopologyDuration,
} from "../../../src";
import { GrpcTransport } from "../../../src/transports/grpc/grpc-transport.js";
import {
    LookupOffsetByTimeRequest,
    LookupOffsetByTimeResponse,
} from "../../../src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/participant_inspection_service.js";
import {
    GetSynchronizerIdRequest,
    GetSynchronizerIdResponse,
    ListConnectedSynchronizersRequest,
    ListConnectedSynchronizersResponse,
} from "../../../src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/synchronizer_connectivity_service.js";

describe("GrpcTransport batch 4 read services", () => {
    it("maps participant inspection and synchronizer connectivity reads", async () => {
        const connectedSynchronizersResponse =
            ListConnectedSynchronizersResponse.create({
                connectedSynchronizers: [{
                    synchronizerAlias: "sync-alias-1",
                    synchronizerId: "sync-1",
                    physicalSynchronizerId: "physical-sync-1",
                    healthy: true,
                }],
            });
        const synchronizerIdResponse = GetSynchronizerIdResponse.create({
            synchronizerId: "sync-1",
            physicalSynchronizerId: "physical-sync-1",
        });
        const offsetResponse = LookupOffsetByTimeResponse.create({
            offset: "42",
        });
        const transport = new GrpcTransport({
            getHealthAsync: async () => ({ version: "3.4.0", features: {} }),
            checkHealthAsync: async () => ({ status: 1 }),
            createPartyAsync: async () => ({ identifier: "unused" }),
            listPartiesAsync: async () => ({ partyDetails: [], nextPageToken: "" }),
            grantUserRightsAsync: async () => ({ rights: [] }),
            uploadPackageAsync: async () => ({ packageId: "unused" }),
            queryContractsAsync: async () => ({ activeContracts: [] }),
            getUpdatesAsync: async () => [],
            submitCommandAsync: async () => ({ updateId: "unused" }),
            lookupOffsetByTimeAsync: async () => offsetResponse,
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
            listConnectedSynchronizersAsync: async () => connectedSynchronizersResponse,
            getSynchronizerIdAsync: async () => synchronizerIdResponse,
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
            LookupOffsetByTimeRequest.create({
                timestamp: { seconds: "1767225600", nanos: 0 },
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
                ListConnectedSynchronizersRequest.create(),
                options,
            );

        const synchronizerId =
            await synchronizerConnectivity.getSynchronizerIdAsync(
                GetSynchronizerIdRequest.create({
                    synchronizerAlias: "sync-alias-1",
                }),
                options,
            );

        expect(offset).toBe(offsetResponse);
        expect(inFlight.pendingSubmissions).toBe(2);
        expect(slowConfig.configs[0]?.thresholdDefault).toBe("5");
        expect(intervalsBehind.intervalsBehind[0]?.behindSince).toEqual(
            new TopologyDuration({
                seconds: "30",
                nanos: 0,
            }),
        );
        expect(connectedSynchronizers).toBe(connectedSynchronizersResponse);
        expect(synchronizerId).toBe(synchronizerIdResponse);
    });
});
