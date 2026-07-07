import { describe, expect, it, vi } from "vitest";
import {
    GetHighestOffsetByTimestampRequest,
    GetHighestOffsetByTimestampResponse,
    ParticipantPartyManagementServiceClient,
    RequestOptions,
} from "../../../src";

describe("ParticipantPartyManagementServiceClient", () => {
    it("forwards participant party management read requests through the selected transport", async () => {
        const getHighestOffsetByTimestampAsync = vi.fn(
            async () =>
                new GetHighestOffsetByTimestampResponse({
                    ledgerOffset: "42",
                }),
        );

        const transport = {
            features: { supportsCommandSigning: false },
            disposeAsync: async () => undefined,
            getHighestOffsetByTimestampAsync,
        };

        const client = new ParticipantPartyManagementServiceClient(
            transport as never,
        );

        const request = new GetHighestOffsetByTimestampRequest({
            synchronizerId: "sync-1",
            timestamp: new Date("2026-01-01T00:00:00.000Z"),
            force: true,
        });

        const options = new RequestOptions({
            timeoutMs: 5_000,
        });

        await expect(
            client.getHighestOffsetByTimestampAsync(
                request,
                options,
            ),
        ).resolves.toBeInstanceOf(GetHighestOffsetByTimestampResponse);

        expect(getHighestOffsetByTimestampAsync).toHaveBeenCalledWith(
            request,
            options,
        );
    });
});
