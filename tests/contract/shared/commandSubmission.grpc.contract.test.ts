import { describe, expect, it, vi } from "vitest";
import {
  SignCommandResult,
  SubmitCommandRequest
} from "../../../src";
import { CommandsClient } from "../../../src/services/commands/commandsClient.js";
import { GrpcTransport } from "../../../src/transports/grpc/grpcTransport.js";

describe("grpc command submission contract", () => {
  it("supports signed command submission", async () => {
    const signAsync = vi.fn(async () =>
      new SignCommandResult({
        algorithm: "ed25519",
        signature: new Uint8Array([1, 2, 3])
      })
    );

    const client = new CommandsClient(
      new GrpcTransport({
        getHealthAsync: async () => ({ status: "healthy" }),
        createPartyAsync: async () => ({ identifier: "unused" }),
        grantUserRightsAsync: async () => ({ rights: [] }),
        uploadPackageAsync: async () => ({ packageId: "unused" }),
        queryContractsAsync: async () => ({ contracts: [] }),
        streamTransactionsAsync: async () => [],
        submitCommandAsync: async () => ({
          commandId: "cmd-1",
          transactionId: "tx-1"
        })
      }),
      { signAsync }
    );

    await expect(
      client.submitAsync(
        new SubmitCommandRequest({
          applicationId: "app-1",
          actAs: ["Alice"]
        })
      )
    ).resolves.toMatchObject({
      commandId: "cmd-1",
      transactionId: "tx-1"
    });

    expect(signAsync).toHaveBeenCalledOnce();
  });
});
