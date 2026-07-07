import { describe, expect, it } from "vitest";
import {
    CantonClient,
    CantonClientOptions,
    NotSupportedError,
    TransportKind,
} from "../../../src";

describe("Batch 8 read services with JSON transport", () => {
    it("rejects unsupported commitment chunk inspection reads", async () => {
        const client = new CantonClient(
            new CantonClientOptions({
                transportKind: TransportKind.json,
                participantAdminEndpoint:
                    "https://participant-admin.example.com",
            }),
        );

        const calls = [
            [
                "ParticipantInspectionService.OpenCommitment",
                () =>
                    (client.participantInspectionService as any).openCommitmentAsync(
                        {
                            commitment: new Uint8Array([7, 8]),
                            physicalSynchronizerId: "physical-sync-1",
                            computedForCounterParticipantUid: "participant-2",
                            periodEndTick: new Date("2026-01-01T00:00:00.000Z"),
                        },
                        { nextAsync: async () => undefined },
                    ),
            ],
            [
                "ParticipantInspectionService.InspectCommitmentContracts",
                () =>
                    (client.participantInspectionService as any)
                        .inspectCommitmentContractsAsync({
                            cids: [new Uint8Array([9, 10])],
                            expectedSynchronizerId: "sync-1",
                            timestamp: new Date("2026-01-01T00:00:00.000Z"),
                            downloadPayload: true,
                        }, { nextAsync: async () => undefined }),
            ],
        ] as const;

        for (const [message, invoke] of calls) {
            await expect(invoke()).rejects.toThrow(NotSupportedError);
            await expect(invoke()).rejects.toThrow(message);
        }
    });
});
