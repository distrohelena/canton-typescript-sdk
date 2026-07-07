import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
    CantonClient,
    HealthCheckRequest,
    HealthCheckStatus,
    TransportKind,
} from "../../../src/index.js";
import { createLiveClient } from "../runtime/live-client-factory.js";
import { createLiveTestEnvironment } from "../runtime/live-test-environment.js";

describe("live system services", () => {
    let grpcClient: CantonClient;

    let jsonClient: CantonClient;

    beforeAll(() => {
        grpcClient = createLiveClient(
            createLiveTestEnvironment({
                transportKind: TransportKind.grpc,
            }),
        );
        jsonClient = createLiveClient(
            createLiveTestEnvironment({
                transportKind: TransportKind.json,
            }),
        );
    });

    afterAll(async () => {
        await Promise.allSettled([
            grpcClient.disposeAsync(),
            jsonClient.disposeAsync(),
        ]);
    });

    it("reads the ledger api version on grpc and json", async () => {
        const grpcVersion =
            await grpcClient.versionService.getLedgerApiVersionAsync();

        const jsonVersion =
            await jsonClient.versionService.getLedgerApiVersionAsync();

        expect(grpcVersion.version.length).toBeGreaterThan(0);
        expect(jsonVersion.version.length).toBeGreaterThan(0);
    });

    it("checks grpc health", async () => {
        const response = await grpcClient.healthService.checkAsync(
            new HealthCheckRequest(),
        );

        expect(response.status).toBe(HealthCheckStatus.serving);
    });

    it("disposes a live grpc client idempotently", async () => {
        const client = createLiveClient(
            createLiveTestEnvironment({
                transportKind: TransportKind.grpc,
            }),
        );

        await client.disposeAsync();
        await expect(client.disposeAsync()).resolves.toBeUndefined();
        await expect(
            client.versionService.getLedgerApiVersionAsync(),
        ).rejects.toThrow();
    });
});
