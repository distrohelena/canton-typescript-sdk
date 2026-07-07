import { describe, expect, it } from "vitest";
import {
    CantonClient,
    CantonClientOptions,
    CountInFlightRequest,
    GetConfigForSlowCounterParticipantsRequest,
    GetIntervalsBehindForCounterParticipantsRequest,
    GetSynchronizerIdRequest,
    ListConnectedSynchronizersRequest,
    LookupOffsetByTimeRequest,
    NotSupportedError,
    TransportKind,
} from "../../../src";

describe("Batch 4 read services with JSON transport", () => {
    it("rejects unsupported participant-admin inspection and synchronizer connectivity reads", async () => {
        const client = new CantonClient(
            new CantonClientOptions({
                transportKind: TransportKind.json,
                participantAdminEndpoint:
                    "https://participant-admin.example.com",
            }),
        );

        const calls = [
            [
                "ParticipantInspectionService.LookupOffsetByTime",
                () =>
                    client.participantInspectionService.lookupOffsetByTimeAsync(
                        new LookupOffsetByTimeRequest({
                            timestamp: new Date("2026-01-01T00:00:00.000Z"),
                        }),
                    ),
            ],
            [
                "ParticipantInspectionService.CountInFlight",
                () =>
                    client.participantInspectionService.countInFlightAsync(
                        new CountInFlightRequest({
                            synchronizerId: "sync-1",
                        }),
                    ),
            ],
            [
                "ParticipantInspectionService.GetConfigForSlowCounterParticipants",
                () =>
                    client.participantInspectionService.getConfigForSlowCounterParticipantsAsync(
                        new GetConfigForSlowCounterParticipantsRequest({
                            synchronizerIds: ["sync-1"],
                        }),
                    ),
            ],
            [
                "ParticipantInspectionService.GetIntervalsBehindForCounterParticipants",
                () =>
                    client.participantInspectionService.getIntervalsBehindForCounterParticipantsAsync(
                        new GetIntervalsBehindForCounterParticipantsRequest({
                            counterParticipantIds: ["participant-1"],
                            synchronizerIds: ["sync-1"],
                        }),
                    ),
            ],
            [
                "SynchronizerConnectivityService.ListConnectedSynchronizers",
                () =>
                    client.synchronizerConnectivityService.listConnectedSynchronizersAsync(
                        new ListConnectedSynchronizersRequest(),
                    ),
            ],
            [
                "SynchronizerConnectivityService.GetSynchronizerId",
                () =>
                    client.synchronizerConnectivityService.getSynchronizerIdAsync(
                        new GetSynchronizerIdRequest({
                            synchronizerAlias: "sync-alias-1",
                        }),
                    ),
            ],
        ] as const;

        for (const [message, invoke] of calls) {
            await expect(invoke()).rejects.toThrow(NotSupportedError);
            await expect(invoke()).rejects.toThrow(message);
        }
    });
});
