import { describe, expect, it, vi } from "vitest";
import {
    GetUpdateByHashRequest,
    GetUpdateByHashResponse,
    GetUpdateByIdRequest,
    GetUpdateByIdResponse,
    GetUpdateByOffsetRequest,
    GetUpdateByOffsetResponse,
    GetUpdatesPageRequest,
    GetUpdatesPageResponse,
    RequestOptions,
    UpdateServiceClient,
} from "../../../src";

describe("UpdateServiceClient read methods", () => {
    it("forwards update read requests through the selected transport", async () => {
        const getUpdateByOffsetAsync = vi.fn(
            async () =>
                new GetUpdateByOffsetResponse({
                    update: undefined,
                }),
        );

        const getUpdateByIdAsync = vi.fn(
            async () =>
                new GetUpdateByIdResponse({
                    update: undefined,
                }),
        );

        const getUpdateByHashAsync = vi.fn(
            async () =>
                new GetUpdateByHashResponse({
                    update: undefined,
                }),
        );

        const getUpdatesPageAsync = vi.fn(
            async () =>
                new GetUpdatesPageResponse({
                    updates: [],
                    lowestPageOffsetExclusive: "0",
                    highestPageOffsetInclusive: "0",
                }),
        );

        const transport = {
            features: { supportsCommandSigning: false },
            getUpdateByOffsetAsync,
            getUpdateByIdAsync,
            getUpdateByHashAsync,
            getUpdatesPageAsync,
        };

        const client = new UpdateServiceClient(transport as never);

        const options = new RequestOptions({
            timeoutMs: 5_000,
        });

        await expect(
            client.getUpdateByOffsetAsync(
                new GetUpdateByOffsetRequest({
                    offset: "7",
                }),
                options,
            ),
        ).resolves.toBeInstanceOf(GetUpdateByOffsetResponse);

        await expect(
            client.getUpdateByIdAsync(
                new GetUpdateByIdRequest({
                    updateId: "update-1",
                }),
                options,
            ),
        ).resolves.toBeInstanceOf(GetUpdateByIdResponse);

        await expect(
            client.getUpdateByHashAsync(
                new GetUpdateByHashRequest({
                    transactionHash: new Uint8Array([1, 2, 3]),
                }),
                options,
            ),
        ).resolves.toBeInstanceOf(GetUpdateByHashResponse);

        await expect(
            client.getUpdatesPageAsync(
                new GetUpdatesPageRequest(),
                options,
            ),
        ).resolves.toBeInstanceOf(GetUpdatesPageResponse);

        expect(getUpdateByOffsetAsync).toHaveBeenCalledWith(
            expect.any(GetUpdateByOffsetRequest),
            options,
        );
        expect(getUpdateByIdAsync).toHaveBeenCalledWith(
            expect.any(GetUpdateByIdRequest),
            options,
        );
        expect(getUpdateByHashAsync).toHaveBeenCalledWith(
            expect.any(GetUpdateByHashRequest),
            options,
        );
        expect(getUpdatesPageAsync).toHaveBeenCalledWith(
            expect.any(GetUpdatesPageRequest),
            options,
        );
    });
});
