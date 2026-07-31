import { describe, expect, it } from "vitest";
import {
    CantonClient,
    CantonClientOptions,
    NotSupportedError,
    TransportKind,
} from "../../../src";
import {
    GetDarContentsRequest,
    GetDarRequest,
    ListDarsRequest,
} from "../../../src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/package_service.js";
import { GetHighestOffsetByTimestampRequest } from "../../../src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/party_management_service.js";
import { ListPendingOperationsRequest } from "../../../src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/participant_repair_service.js";

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
                        GetDarRequest.create({
                            mainPackageId: "pkg-1",
                        }),
                    ),
            ],
            [
                "ParticipantPackageService.ListDars",
                () =>
                    client.participantPackageService.listDarsAsync(
                        ListDarsRequest.create({
                            limit: 10,
                        }),
                    ),
            ],
            [
                "ParticipantPackageService.GetDarContents",
                () =>
                    client.participantPackageService.getDarContentsAsync(
                        GetDarContentsRequest.create({
                            mainPackageId: "pkg-1",
                        }),
                    ),
            ],
            [
                "ParticipantPartyManagementService.GetHighestOffsetByTimestamp",
                () =>
                    client.participantPartyManagementService.getHighestOffsetByTimestampAsync(
                        GetHighestOffsetByTimestampRequest.create({
                            synchronizerId: "sync-1",
                            timestamp: { seconds: "1767225600", nanos: 0 },
                        }),
                    ),
            ],
            [
                "ParticipantRepairService.ListPendingOperations",
                () =>
                    client.participantRepairService.listPendingOperationsAsync(
                        ListPendingOperationsRequest.create(),
                    ),
            ],
        ] as const;

        for (const [message, invoke] of calls) {
            await expect(invoke()).rejects.toThrow(NotSupportedError);
            await expect(invoke()).rejects.toThrow(message);
        }
    });
});
