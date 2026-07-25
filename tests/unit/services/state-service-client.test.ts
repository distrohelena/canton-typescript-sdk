import { describe, expect, it, vi } from "vitest";
import {
    RequestOptions,
    StateServiceClient,
} from "../../../src";
import {
    GetConnectedSynchronizersRequest,
    GetConnectedSynchronizersResponse,
    GetLedgerEndRequest,
    GetLedgerEndResponse,
    GetLatestPrunedOffsetsRequest,
    GetLatestPrunedOffsetsResponse,
} from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/state_service.js";

describe("StateServiceClient read methods", () => {
    it("forwards state read requests through the selected transport", async () => {
        const connectedSynchronizersResponse =
            GetConnectedSynchronizersResponse.create();
        const getConnectedSynchronizersAsync = vi.fn(
            async () => connectedSynchronizersResponse,
        );

        const ledgerEndResponse = GetLedgerEndResponse.create({ offset: 7n });
        const getLedgerEndAsync = vi.fn(async () => ledgerEndResponse);

        const prunedOffsetsResponse = GetLatestPrunedOffsetsResponse.create({
            participantPrunedUpToInclusive: 3n,
        });
        const getLatestPrunedOffsetsAsync = vi.fn(
            async () => prunedOffsetsResponse,
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
                GetConnectedSynchronizersRequest.create(),
                options,
            ),
        ).resolves.toBe(connectedSynchronizersResponse);

        await expect(
            client.getLedgerEndAsync(
                GetLedgerEndRequest.create(),
                options,
            ),
        ).resolves.toBe(ledgerEndResponse);

        await expect(
            client.getLatestPrunedOffsetsAsync(
                GetLatestPrunedOffsetsRequest.create(),
                options,
            ),
        ).resolves.toBe(prunedOffsetsResponse);

        expect(getConnectedSynchronizersAsync).toHaveBeenCalledWith(
            GetConnectedSynchronizersRequest.create(),
            options,
        );
        expect(getLedgerEndAsync).toHaveBeenCalledWith(
            GetLedgerEndRequest.create(),
            options,
        );
        expect(getLatestPrunedOffsetsAsync).toHaveBeenCalledWith(
            GetLatestPrunedOffsetsRequest.create(),
            options,
        );
    });
});
