import { describe, expect, it } from "vitest";
import {
    CantonClient,
    CantonClientOptions,
    NotSupportedError,
    TransportKind,
} from "../../../src";
import { TrafficControlStateRequest } from "../../../src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/traffic_control_service.js";

describe("Batch 6 read services with JSON transport", () => {
    it("rejects unsupported traffic control reads", async () => {
        const client = new CantonClient(
            new CantonClientOptions({
                transportKind: TransportKind.json,
                participantAdminEndpoint:
                    "https://participant-admin.example.com",
            }),
        );

        await expect(
            client.trafficControlService.trafficControlStateAsync(
                TrafficControlStateRequest.create({
                    synchronizerId: "sync-1",
                }),
            ),
        ).rejects.toThrow(NotSupportedError);

        await expect(
            client.trafficControlService.trafficControlStateAsync(
                TrafficControlStateRequest.create({
                    synchronizerId: "sync-1",
                }),
            ),
        ).rejects.toThrow(
            "TrafficControlService.TrafficControlState",
        );
    });
});
