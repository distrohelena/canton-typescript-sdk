import { describe, expect, it } from "vitest";
import {
    CantonClient,
    CantonClientOptions,
    NotSupportedError,
    TransportKind,
} from "../../../src";
import {
    GetNoWaitCommitmentsFromRequest,
    GetParticipantScheduleRequest,
    GetScheduleRequest,
} from "../../../src/transports/grpc/generated/canton/com/digitalasset/canton/admin/pruning/v30/pruning.js";
import { GetSafePruningOffsetRequest } from "../../../src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/pruning_service.js";

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
                        GetSafePruningOffsetRequest.create({
                            beforeOrAt: { seconds: "1767225600", nanos: 0 },
                            ledgerEnd: "100",
                        }),
                    ),
            ],
            [
                "PruningService.GetSchedule",
                () =>
                    client.pruningService.getScheduleAsync(
                        GetScheduleRequest.create(),
                    ),
            ],
            [
                "PruningService.GetParticipantSchedule",
                () =>
                    client.pruningService.getParticipantScheduleAsync(
                        GetParticipantScheduleRequest.create(),
                    ),
            ],
            [
                "PruningService.GetNoWaitCommitmentsFrom",
                () =>
                    client.pruningService.getNoWaitCommitmentsFromAsync(
                        GetNoWaitCommitmentsFromRequest.create({
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
