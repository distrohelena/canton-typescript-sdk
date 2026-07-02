import { describe, expect, it } from "vitest";
import { QueryContractsRequest, SubmitCommandRequest } from "../../../src";
import { createFakeGrpcOperations } from "../../fixtures/fakeGrpcServices.js";

describe("grpc transport entrypoint", () => {
  it("exports protocol-specific entrypoints", async () => {
    const grpcModule = await import("../../../src/grpc/index.js");
    const client = new grpcModule.GrpcLedgerClient(
      createFakeGrpcOperations({
        queryContractsAsync: async () => ({ contracts: [{ contractId: "c2" }] })
      })
    );

    expect(grpcModule).toHaveProperty("GrpcLedgerClient");
    await expect(
      client.contracts.queryAsync(new QueryContractsRequest({ templateId: "Main:Iou" }))
    ).resolves.toBeDefined();
    await expect(
      client.commands.submitAsync(
        new SubmitCommandRequest({
          applicationId: "app-1",
          actAs: ["Alice"]
        })
      )
    ).resolves.toBeDefined();
  });
});
