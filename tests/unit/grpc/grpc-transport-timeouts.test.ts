import { describe, expect, it, vi } from "vitest";
import { ObjectDisposedError } from "../../../src";
import { RequestOptions } from "../../../src/core/types/request-options.js";
import { GrpcTransport } from "../../../src/transports/grpc/grpc-transport.js";

describe("GrpcTransport request timeouts", () => {
    it("forwards shared request options into grpc operations", async () => {
        const getHealthAsync = vi.fn(async (_options?: RequestOptions) => ({
            version: "3.4.0",
            features: {},
        }));

        const transport = new GrpcTransport({
            checkHealthAsync: async () => ({ status: 1 }),
            getHealthAsync,
            createPartyAsync: async () => ({ identifier: "Alice" }),
            listPartiesAsync: async () => ({
                partyDetails: [],
                nextPageToken: "",
            }),
            grantUserRightsAsync: async () => ({
                rights: [],
            }),
            uploadPackageAsync: async () => ({ packageId: "pkg-1" }),
            queryContractsAsync: async () => ({ contracts: [] }),
            streamTransactionsAsync: async () => [],
            submitCommandAsync: async () => ({
                commandId: "cmd-1",
                transactionId: "tx-1",
            }),
        });

        const options = new RequestOptions({
            timeoutMs: 2_500,
        });

        await transport.getLedgerApiVersionAsync(undefined, options);

        expect(getHealthAsync).toHaveBeenLastCalledWith(options);
    });

    it("does not forward calls after disposal", async () => {
        const getHealthAsync = vi.fn(async (_options?: RequestOptions) => ({
            version: "3.4.0",
            features: {},
        }));

        const transport = new GrpcTransport({
            disposeAsync: async () => undefined,
            checkHealthAsync: async () => ({ status: 1 }),
            getHealthAsync,
            createPartyAsync: async () => ({ identifier: "Alice" }),
            listPartiesAsync: async () => ({
                partyDetails: [],
                nextPageToken: "",
            }),
            grantUserRightsAsync: async () => ({
                rights: [],
            }),
            uploadPackageAsync: async () => ({ packageId: "pkg-1" }),
            queryContractsAsync: async () => ({ contracts: [] }),
            streamTransactionsAsync: async () => [],
            submitCommandAsync: async () => ({
                commandId: "cmd-1",
                transactionId: "tx-1",
            }),
        });

        await transport.disposeAsync();

        await expect(
            transport.getLedgerApiVersionAsync(),
        ).rejects.toThrow(ObjectDisposedError);
        expect(getHealthAsync).not.toHaveBeenCalled();
    });
});
