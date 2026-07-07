import { describe, expect, it, vi } from "vitest";
import {
    GetConnectedSynchronizersRequest,
    GetConnectedSynchronizersResponse,
    GetLedgerEndRequest,
    GetLedgerEndResponse,
    GetLatestPrunedOffsetsRequest,
    GetLatestPrunedOffsetsResponse,
    RequestOptions,
    StateServiceClient,
} from "../../../src";

describe("StateServiceClient read methods", () => {
    it("forwards state read requests through the selected transport", async () => {
        const getConnectedSynchronizersAsync = vi.fn(
            async () =>
                new GetConnectedSynchronizersResponse({
                    connectedSynchronizers: [],
                }),
        );

        const getLedgerEndAsync = vi.fn(
            async () =>
                new GetLedgerEndResponse({
                    offset: "7",
                }),
        );

        const getLatestPrunedOffsetsAsync = vi.fn(
            async () =>
                new GetLatestPrunedOffsetsResponse({
                    participantPrunedUpToInclusive: "3",
                }),
        );

        const transport = {
            features: { supportsCommandSigning: false },
            getConnectedSynchronizersAsync,
            getLedgerEndAsync,
            getLatestPrunedOffsetsAsync,
        };

        const client = new StateServiceClient(transport as never);

        const options = new RequestOptions({
            timeoutMs: 5_000,
        });

        await expect(
            client.getConnectedSynchronizersAsync(
                new GetConnectedSynchronizersRequest(),
                options,
            ),
        ).resolves.toBeInstanceOf(GetConnectedSynchronizersResponse);

        await expect(
            client.getLedgerEndAsync(
                new GetLedgerEndRequest(),
                options,
            ),
        ).resolves.toBeInstanceOf(GetLedgerEndResponse);

        await expect(
            client.getLatestPrunedOffsetsAsync(
                new GetLatestPrunedOffsetsRequest(),
                options,
            ),
        ).resolves.toBeInstanceOf(GetLatestPrunedOffsetsResponse);

        expect(getConnectedSynchronizersAsync).toHaveBeenCalledWith(
            expect.any(GetConnectedSynchronizersRequest),
            options,
        );
        expect(getLedgerEndAsync).toHaveBeenCalledWith(
            expect.any(GetLedgerEndRequest),
            options,
        );
        expect(getLatestPrunedOffsetsAsync).toHaveBeenCalledWith(
            expect.any(GetLatestPrunedOffsetsRequest),
            options,
        );
    });
});
