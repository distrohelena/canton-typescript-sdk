import { describe, expect, it } from "vitest";
import {
    CantonClient,
    CantonClientOptions,
    GetLedgerApiVersionResponse,
    ObjectDisposedError,
    TransportKind,
} from "../../../src";
import { VersionServiceClient } from "../../../src/services/version/version-service-client.js";
import { JsonTransport } from "../../../src/transports/json/json-transport.js";

describe("VersionServiceClient with JSON transport", () => {
    it("maps JSON ledger API version responses into sdk types", async () => {
        const transport = new JsonTransport({
            getAsync: async () => ({ status: "healthy", version: "1.0.0" }),
            postAsync: async () => ({}),
        });

        const client = new VersionServiceClient(transport);

        await expect(client.getLedgerApiVersionAsync()).resolves.toBeInstanceOf(
            GetLedgerApiVersionResponse,
        );
    });

    it("rejects captured service calls after client disposal", async () => {
        const client = new CantonClient(
            new CantonClientOptions({
                transportKind: TransportKind.json,
                endpoint: "https://participant.example.com",
            }),
        );

        const versionService = client.versionService;

        await client.disposeAsync();

        await expect(
            versionService.getLedgerApiVersionAsync(),
        ).rejects.toThrow(ObjectDisposedError);
    });
});
