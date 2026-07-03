import { describe, expect, it } from "vitest";
import { GrpcChannelSecurity } from "../../../src";
import {
    buildGrpcCallOptionsAsync,
    createGrpcChannelCredentials,
} from "../../../src/transports/grpc/grpc-call-options-factory.js";

describe("gRPC call-options factory", () => {
    it("creates insecure channel credentials", () => {
        const credentials = createGrpcChannelCredentials(
            GrpcChannelSecurity.insecure,
        );

        expect(credentials).toBeDefined();
    });

    it("forwards all auth headers into metadata", async () => {
        const options = await buildGrpcCallOptionsAsync({
            getHeadersAsync: async () => ({
                authorization: "Bearer token-123",
                "x-canton-test": "yes",
            }),
        });

        const metadata = options.meta as Record<string, string>;

        expect(metadata.authorization).toBe("Bearer token-123");
        expect(metadata["x-canton-test"]).toBe("yes");
    });
});
