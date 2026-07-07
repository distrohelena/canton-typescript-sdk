import { describe, expect, it, vi } from "vitest";
import {
    CurrentTimeRequest,
    CurrentTimeResponse,
    GetIdRequest,
    GetIdResponse,
    IdentityInitializationServiceClient,
    RequestOptions,
} from "../../../src";

describe("IdentityInitializationServiceClient", () => {
    it("forwards identity initialization read requests through the selected transport", async () => {
        const getIdAsync = vi.fn(
            async () =>
                new GetIdResponse({
                    initialized: true,
                    uniqueIdentifier: "participant::sandbox",
                }),
        );

        const currentTimeAsync = vi.fn(
            async () =>
                new CurrentTimeResponse({
                    currentTime: "1710000000000",
                }),
        );

        const transport = {
            features: { supportsCommandSigning: false },
            disposeAsync: async () => undefined,
            getIdAsync,
            currentTimeAsync,
        };

        const client = new IdentityInitializationServiceClient(
            transport as never,
        );

        const getIdRequest = new GetIdRequest();

        const currentTimeRequest = new CurrentTimeRequest();

        const options = new RequestOptions({
            timeoutMs: 5_000,
        });

        await expect(
            client.getIdAsync(
                getIdRequest,
                options,
            ),
        ).resolves.toBeInstanceOf(GetIdResponse);

        await expect(
            client.currentTimeAsync(
                currentTimeRequest,
                options,
            ),
        ).resolves.toBeInstanceOf(CurrentTimeResponse);

        expect(getIdAsync).toHaveBeenCalledWith(
            getIdRequest,
            options,
        );
        expect(currentTimeAsync).toHaveBeenCalledWith(
            currentTimeRequest,
            options,
        );
    });
});
