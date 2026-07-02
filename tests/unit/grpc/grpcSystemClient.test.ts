import { describe, expect, it } from "vitest";
import { SystemClient } from "../../../src/services/system/systemClient.js";
import { GrpcTransport } from "../../../src/transports/grpc/grpcTransport.js";

describe("SystemClient with gRPC transport", () => {
  it("reports grpc signing capability", async () => {
    const transport = new GrpcTransport({
      getHealthAsync: async () => ({ status: "healthy", version: "1.0.0" }),
      createPartyAsync: async () => ({ identifier: "Alice" }),
      grantUserRightsAsync: async () => ({ rights: [{ type: "participantAdmin" }] }),
      uploadPackageAsync: async () => ({ packageId: "pkg-1" })
    });

    const client = new SystemClient(transport);

    expect(transport.features.supportsCommandSigning).toBe(true);
    await expect(client.getHealthAsync()).resolves.toMatchObject({ status: "healthy" });
  });
});
