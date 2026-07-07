import { describe, expect, it } from "vitest";
import { ObjectDisposedError } from "../../../src";
import { createFakeGrpcOperations } from "../../fixtures/fake-grpc-services.js";
import { GrpcTransport } from "../../../src/transports/grpc/grpc-transport.js";
import { JsonTransport } from "../../../src/transports/json/json-transport.js";

describe("transport surface", () => {
    it("does not expose legacy internal transport method names", () => {
        const grpcTransport = new GrpcTransport(createFakeGrpcOperations());

        const jsonTransport = new JsonTransport({
            getAsync: async () => ({}),
            postAsync: async () => ({}),
        });

        expect(grpcTransport).not.toHaveProperty("getHealthAsync");
        expect(grpcTransport).not.toHaveProperty("createPartyAsync");
        expect(grpcTransport).not.toHaveProperty("listPartiesAsync");
        expect(grpcTransport).not.toHaveProperty("uploadPackageAsync");
        expect(grpcTransport).not.toHaveProperty("queryContractsAsync");
        expect(grpcTransport).not.toHaveProperty("streamQueryAsync");
        expect(grpcTransport).not.toHaveProperty("streamTransactionsAsync");
        expect(grpcTransport).not.toHaveProperty("assembleSignedTransactions");

        expect(jsonTransport).not.toHaveProperty("getHealthAsync");
        expect(jsonTransport).not.toHaveProperty("createPartyAsync");
        expect(jsonTransport).not.toHaveProperty("listPartiesAsync");
        expect(jsonTransport).not.toHaveProperty("uploadPackageAsync");
        expect(jsonTransport).not.toHaveProperty("queryContractsAsync");
        expect(jsonTransport).not.toHaveProperty("streamQueryAsync");
        expect(jsonTransport).not.toHaveProperty("streamTransactionsAsync");
        expect(jsonTransport).not.toHaveProperty("assembleSignedTransactions");
    });

    it("rejects json transport calls after disposal", async () => {
        const jsonTransport = new JsonTransport({
            getAsync: async () => ({ status: "healthy", version: "1.0.0" }),
            postAsync: async () => ({}),
        });

        await jsonTransport.disposeAsync();

        await expect(
            jsonTransport.getLedgerApiVersionAsync(),
        ).rejects.toThrow(ObjectDisposedError);
    });
});
