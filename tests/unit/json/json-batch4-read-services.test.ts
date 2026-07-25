import { describe, expect, it } from "vitest";
import {
    CantonClient,
    CantonClientOptions,
    CountInFlightRequest,
    GetConfigForSlowCounterParticipantsRequest,
    GetIntervalsBehindForCounterParticipantsRequest,
    NotSupportedError,
    TransportKind,
} from "../../../src";
import {
    LookupOffsetByTimeRequest,
} from "../../../src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/participant_inspection_service.js";
import {
    GetSynchronizerIdRequest,
    ListConnectedSynchronizersRequest,
} from "../../../src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/synchronizer_connectivity_service.js";

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
                        LookupOffsetByTimeRequest.create({
                            timestamp: { seconds: "1767225600", nanos: 0 },
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
                        ListConnectedSynchronizersRequest.create(),
                    ),
            ],
            [
                "SynchronizerConnectivityService.GetSynchronizerId",
                () =>
                    client.synchronizerConnectivityService.getSynchronizerIdAsync(
                        GetSynchronizerIdRequest.create({
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
