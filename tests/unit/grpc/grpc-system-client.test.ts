import { describe, expect, it, vi } from "vitest";
import { GetLedgerApiVersionResponse, ObjectDisposedError } from "../../../src";
import { VersionServiceClient } from "../../../src/services/version/version-service-client.js";
import { GrpcTransport } from "../../../src/transports/grpc/grpc-transport.js";

describe("VersionServiceClient with gRPC transport", () => {
    it("reports grpc signing capability", async () => {
        const transport = new GrpcTransport({
            getHealthAsync: async () => ({
                version: "3.4.0",
                features: {},
            }),
            createPartyAsync: async () => ({ identifier: "Alice" }),
            grantUserRightsAsync: async () => ({
                rights: [{ type: "participantAdmin" }],
            }),
            uploadPackageAsync: async () => ({ packageId: "pkg-1" }),
        });

        const client = new VersionServiceClient(transport);

        expect(transport.features.supportsCommandSigning).toBe(true);
        await expect(client.getLedgerApiVersionAsync()).resolves.toBeInstanceOf(
            GetLedgerApiVersionResponse,
        );
    });

    it("disposes grpc operations once and rejects later calls", async () => {
        const disposeAsync = vi.fn(async () => undefined);

        const transport = new GrpcTransport({
            disposeAsync,
            getHealthAsync: async () => ({
                version: "3.4.0",
                features: {},
            }),
            checkHealthAsync: async () => ({ status: 1 }),
            createPartyAsync: async () => ({ identifier: "Alice" }),
            listPartiesAsync: async () => ({
                partyDetails: [],
                nextPageToken: "",
            }),
            grantUserRightsAsync: async () => ({
                rights: [{ type: "participantAdmin" }],
            }),
            uploadPackageAsync: async () => ({ packageId: "pkg-1" }),
            queryContractsAsync: async () => ({ contracts: [] }),
            streamTransactionsAsync: async () => [],
            submitCommandAsync: async () => ({
                commandId: "cmd-1",
                transactionId: "tx-1",
            }),
        });

        const client = new VersionServiceClient(transport);

        await transport.disposeAsync();
        await transport.disposeAsync();

        expect(disposeAsync).toHaveBeenCalledTimes(1);
        await expect(client.getLedgerApiVersionAsync()).rejects.toThrow(
            ObjectDisposedError,
        );
    });
});
