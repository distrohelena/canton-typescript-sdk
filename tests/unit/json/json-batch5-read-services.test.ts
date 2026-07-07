import { describe, expect, it } from "vitest";
import {
    CantonClient,
    CantonClientOptions,
    GetNoWaitCommitmentsFromRequest,
    GetParticipantPruningScheduleRequest,
    GetPruningScheduleRequest,
    GetSafePruningOffsetRequest,
    NotSupportedError,
    TransportKind,
} from "../../../src";

describe("Batch 5 read services with JSON transport", () => {
    it("rejects unsupported pruning read methods", async () => {
        const client = new CantonClient(
            new CantonClientOptions({
                transportKind: TransportKind.json,
                participantAdminEndpoint:
                    "https://participant-admin.example.com",
            }),
        );

        const calls = [
            [
                "PruningService.GetSafePruningOffset",
                () =>
                    client.pruningService.getSafePruningOffsetAsync(
                        new GetSafePruningOffsetRequest({
                            beforeOrAt: new Date("2026-01-01T00:00:00.000Z"),
                            ledgerEnd: "100",
                        }),
                    ),
            ],
            [
                "PruningService.GetSchedule",
                () =>
                    client.pruningService.getScheduleAsync(
                        new GetPruningScheduleRequest(),
                    ),
            ],
            [
                "PruningService.GetParticipantSchedule",
                () =>
                    client.pruningService.getParticipantScheduleAsync(
                        new GetParticipantPruningScheduleRequest(),
                    ),
            ],
            [
                "PruningService.GetNoWaitCommitmentsFrom",
                () =>
                    client.pruningService.getNoWaitCommitmentsFromAsync(
                        new GetNoWaitCommitmentsFromRequest({
                            synchronizerIds: ["sync-1"],
                            participantUids: ["participant-1"],
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
