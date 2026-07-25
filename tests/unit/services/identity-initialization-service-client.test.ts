import { describe, expect, it, vi } from "vitest";
import {
    IdentityInitializationServiceClient,
    RequestOptions,
} from "../../../src";
import {
    CurrentTimeRequest,
    CurrentTimeResponse,
    GetIdRequest,
    GetIdResponse,
} from "../../../src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/initialization_service.js";

describe("IdentityInitializationServiceClient", () => {
    it("forwards identity initialization read requests through the selected transport", async () => {
        const getIdAsync = vi.fn(
            async () =>
                GetIdResponse.create({
                    initialized: true,
                    uniqueIdentifier: "participant::sandbox",
                }),
        );

        const currentTimeAsync = vi.fn(
            async () =>
                CurrentTimeResponse.create({
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

        const getIdRequest = GetIdRequest.create();

        const currentTimeRequest = CurrentTimeRequest.create();

        const options = new RequestOptions({
            timeoutMs: 5_000,
        });

        await expect(
            client.getIdAsync(
                getIdRequest,
                options,
            ),
        ).resolves.toEqual(GetIdResponse.create({
            initialized: true,
            uniqueIdentifier: "participant::sandbox",
        }));

        await expect(
            client.currentTimeAsync(
                currentTimeRequest,
                options,
            ),
        ).resolves.toEqual(CurrentTimeResponse.create({
            currentTime: "1710000000000",
        }));

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
