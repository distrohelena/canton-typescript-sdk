import { describe, expect, it } from "vitest";
import {
    CantonClient,
    CantonClientOptions,
    NotSupportedError,
    TrafficControlStateRequest,
    TransportKind,
} from "../../../src";

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
                new TrafficControlStateRequest({
                    synchronizerId: "sync-1",
                }),
            ),
        ).rejects.toThrow(NotSupportedError);

        await expect(
            client.trafficControlService.trafficControlStateAsync(
                new TrafficControlStateRequest({
                    synchronizerId: "sync-1",
                }),
            ),
        ).rejects.toThrow(
            "TrafficControlService.TrafficControlState",
        );
    });
});
