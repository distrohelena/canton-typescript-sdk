import { describe, expect, it } from "vitest";
import {
    CantonClient,
    CantonClientOptions,
    NotSupportedError,
    TransportKind,
} from "../../../src";

describe("Batch 7 read services with JSON transport", () => {
    it("rejects unsupported ACS commitment inspection and registered synchronizer reads", async () => {
        const client = new CantonClient(
            new CantonClientOptions({
                transportKind: TransportKind.json,
                participantAdminEndpoint:
                    "https://participant-admin.example.com",
            }),
        );

        const calls = [
            [
                "ParticipantInspectionService.LookupSentAcsCommitments",
                () =>
                    (client.participantInspectionService as any)
                        .lookupSentAcsCommitmentsAsync({
                            timeRanges: [],
                            counterParticipantIds: ["participant-1"],
                            commitmentState: [],
                            verbose: true,
                        }),
            ],
            [
                "ParticipantInspectionService.LookupReceivedAcsCommitments",
                () =>
                    (client.participantInspectionService as any)
                        .lookupReceivedAcsCommitmentsAsync({
                            timeRanges: [],
                            counterParticipantIds: ["participant-1"],
                            commitmentState: [],
                            verbose: true,
                        }),
            ],
            [
                "SynchronizerConnectivityService.ListRegisteredSynchronizers",
                () =>
                    (client.synchronizerConnectivityService as any)
                        .listRegisteredSynchronizersAsync({
                            allStatuses: true,
                        }),
            ],
        ] as const;

        for (const [message, invoke] of calls) {
            await expect(invoke()).rejects.toThrow(NotSupportedError);
            await expect(invoke()).rejects.toThrow(message);
        }
    });
});
