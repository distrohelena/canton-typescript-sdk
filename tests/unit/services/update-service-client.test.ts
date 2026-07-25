import { describe, expect, it, vi } from "vitest";
import {
    RequestOptions,
    UpdateServiceClient,
} from "../../../src";
import {
    GetUpdateByHashRequest,
    GetUpdateByIdRequest,
    GetUpdateByOffsetRequest,
    GetUpdateResponse,
    GetUpdatesPageRequest,
    GetUpdatesPageResponse,
    GetUpdatesRequest,
    GetUpdatesResponse,
} from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js";

describe("UpdateServiceClient read methods", () => {
    it("forwards update read requests through the selected transport", async () => {
        const getUpdateByOffsetAsync = vi.fn(
            async () =>
                GetUpdateResponse.create({ update: { oneofKind: undefined } }),
        );

        const getUpdateByIdAsync = vi.fn(
            async () =>
                GetUpdateResponse.create({ update: { oneofKind: undefined } }),
        );

        const getUpdateByHashAsync = vi.fn(
            async () =>
                GetUpdateResponse.create({ update: { oneofKind: undefined } }),
        );

        const getUpdatesPageAsync = vi.fn(
            async () =>
                GetUpdatesPageResponse.create({ updates: [] }),
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
                GetUpdateByOffsetRequest.create({ offset: "7" }),
                options,
            ),
        ).resolves.toBe(
            await getUpdateByOffsetAsync.mock.results[0]?.value,
        );

        await expect(
            client.getUpdateByIdAsync(
                GetUpdateByIdRequest.create({ updateId: "update-1" }),
                options,
            ),
        ).resolves.toBe(
            await getUpdateByIdAsync.mock.results[0]?.value,
        );

        await expect(
            client.getUpdateByHashAsync(
                GetUpdateByHashRequest.create({ transactionHash: new Uint8Array([1, 2, 3]) }),
                options,
            ),
        ).resolves.toBe(
            await getUpdateByHashAsync.mock.results[0]?.value,
        );

        await expect(
            client.getUpdatesPageAsync(
                GetUpdatesPageRequest.create(),
                options,
            ),
        ).resolves.toBe(
            await getUpdatesPageAsync.mock.results[0]?.value,
        );

        expect(getUpdateByOffsetAsync).toHaveBeenCalledWith(
            expect.objectContaining({ offset: "7" }),
            options,
        );
        expect(getUpdateByIdAsync).toHaveBeenCalledWith(
            expect.objectContaining({ updateId: "update-1" }),
            options,
        );
        expect(getUpdateByHashAsync).toHaveBeenCalledWith(
            expect.objectContaining({ transactionHash: new Uint8Array([1, 2, 3]) }),
            options,
        );
        expect(getUpdatesPageAsync).toHaveBeenCalledWith(
            expect.objectContaining({}),
            options,
        );
    });

    it("returns generated updates unchanged and exposes a lazy generated stream", async () => {
        const response = GetUpdateResponse.create({ update: { oneofKind: undefined } });
        const streamed = GetUpdatesResponse.create({ update: { oneofKind: undefined } });
        const getUpdateByIdAsync = vi.fn(async () => response);
        const getUpdatesAsync = vi.fn(() => (async function* () { yield streamed; })());
        const client = new UpdateServiceClient({
            features: { supportsCommandSigning: false },
            getUpdateByIdAsync,
            getUpdatesAsync,
        } as never);

        expect(await client.getUpdateByIdAsync(GetUpdateByIdRequest.create({ updateId: "u" }))).toBe(response);
        const stream = client.getUpdatesAsync(GetUpdatesRequest.create({ beginExclusive: "0" }));
        expect(getUpdatesAsync).not.toHaveBeenCalled();
        expect((await stream[Symbol.asyncIterator]().next()).value).toBe(streamed);
    });
});
