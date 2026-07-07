import { describe, expect, it } from "vitest";
import {
    CantonClient,
    CantonClientOptions,
    GetDarContentsRequest,
    GetDarRequest,
    GetHighestOffsetByTimestampRequest,
    ListDarsRequest,
    ListPendingOperationsRequest,
    NotSupportedError,
    TransportKind,
} from "../../../src";

describe("Batch 3 read services with JSON transport", () => {
    it("rejects unsupported participant-admin read methods", async () => {
        const client = new CantonClient(
            new CantonClientOptions({
                transportKind: TransportKind.json,
                participantAdminEndpoint:
                    "https://participant-admin.example.com",
            }),
        );

        const calls = [
            [
                "ParticipantPackageService.GetDar",
                () =>
                    client.participantPackageService.getDarAsync(
                        new GetDarRequest({
                            mainPackageId: "pkg-1",
                        }),
                    ),
            ],
            [
                "ParticipantPackageService.ListDars",
                () =>
                    client.participantPackageService.listDarsAsync(
                        new ListDarsRequest({
                            limit: 10,
                        }),
                    ),
            ],
            [
                "ParticipantPackageService.GetDarContents",
                () =>
                    client.participantPackageService.getDarContentsAsync(
                        new GetDarContentsRequest({
                            mainPackageId: "pkg-1",
                        }),
                    ),
            ],
            [
                "ParticipantPartyManagementService.GetHighestOffsetByTimestamp",
                () =>
                    client.participantPartyManagementService.getHighestOffsetByTimestampAsync(
                        new GetHighestOffsetByTimestampRequest({
                            synchronizerId: "sync-1",
                            timestamp: new Date("2026-01-01T00:00:00.000Z"),
                        }),
                    ),
            ],
            [
                "ParticipantRepairService.ListPendingOperations",
                () =>
                    client.participantRepairService.listPendingOperationsAsync(
                        new ListPendingOperationsRequest(),
                    ),
            ],
        ] as const;

        for (const [message, invoke] of calls) {
            await expect(invoke()).rejects.toThrow(NotSupportedError);
            await expect(invoke()).rejects.toThrow(message);
        }
    });
});
