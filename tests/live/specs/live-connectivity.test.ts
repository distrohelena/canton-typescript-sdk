import { describe, expect, it } from "vitest";
import {
    GrpcChannelSecurity,
    ListUsersRequest,
    TransportKind,
} from "../../../src/index.js";
import { createLiveTestEnvironment } from "../runtime/live-test-environment.js";
import { createLiveClient } from "../runtime/live-client-factory.js";
import { assertLiveConnectivityAsync } from "../runtime/live-connectivity-preflight.js";

describe("live quickstart connectivity harness", () => {
    it("uses quickstart-friendly default endpoints for grpc", () => {
        const environment = createLiveTestEnvironment({
            transportKind: TransportKind.grpc,
        });

        expect(environment.options.transportKind).toBe(TransportKind.grpc);
        expect(environment.options.ledgerEndpoint).toBe("http://localhost:3901");
        expect(environment.options.ledgerAdminEndpoint).toBe(
            "http://localhost:3901",
        );
        expect(environment.options.participantAdminEndpoint).toBe(
            "http://localhost:3902",
        );
        expect(environment.options.grpcChannelSecurity).toBe(
            GrpcChannelSecurity.insecure,
        );
    });

    it("uses quickstart-friendly default endpoints for json", () => {
        const environment = createLiveTestEnvironment({
            transportKind: TransportKind.json,
        });

        expect(environment.options.transportKind).toBe(TransportKind.json);
        expect(environment.options.ledgerEndpoint).toBe("http://localhost:3975");
        expect(environment.options.ledgerAdminEndpoint).toBe(
            "http://localhost:3975",
        );
        expect(environment.options.participantAdminEndpoint).toBeUndefined();
    });

    it("fails fast only if the configured localnet is unreachable", async () => {
        const grpcEnvironment = createLiveTestEnvironment({
            transportKind: TransportKind.grpc,
        });

        const jsonEnvironment = createLiveTestEnvironment({
            transportKind: TransportKind.json,
        });

        await expect(
            assertLiveConnectivityAsync(grpcEnvironment),
        ).resolves.toBeUndefined();
        await expect(
            assertLiveConnectivityAsync(jsonEnvironment),
        ).resolves.toBeUndefined();
    });

    it("accepts the configured bearer token for user-management requests", async () => {
        const environment = createLiveTestEnvironment({
            transportKind: TransportKind.grpc,
        });
        const client = createLiveClient(environment);

        try {
            await expect(
                client.userManagementService.listUsersAsync(
                    new ListUsersRequest({ pageSize: 1 }),
                ),
            ).resolves.toBeDefined();
        } finally {
            await client.disposeAsync();
        }
    });
});
