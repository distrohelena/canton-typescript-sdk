import { describe, expect, it, vi } from "vitest";
import { QueryContractsRequest, QueryContractsResponse, StreamTransactionsRequest } from "../../../src";
import { ContractsClient } from "../../../src/services/contracts/contractsClient.js";
import { EventsClient } from "../../../src/services/events/eventsClient.js";
import { GrpcTransport } from "../../../src/transports/grpc/grpcTransport.js";
import { JsonTransport } from "../../../src/transports/json/jsonTransport.js";

describe("shared ledger read services contract", () => {
  it("supports query and event reads on json and grpc transports", async () => {
    const jsonTransport = new JsonTransport({
      getAsync: async () => ({ status: "healthy" }),
      postAsync: async (path: string) => {
        if (path === "/v1/query") {
          return { result: [{ contractId: "c1" }] };
        }

        if (path === "/v1/stream/query") {
          return { events: [{ transactionId: "json-tx-1" }] };
        }

        return {};
      }
    });
    const grpcTransport = new GrpcTransport({
      getHealthAsync: async () => ({ status: "healthy" }),
      createPartyAsync: async () => ({ identifier: "unused" }),
      grantUserRightsAsync: async () => ({ rights: [] }),
      uploadPackageAsync: async () => ({ packageId: "unused" }),
      queryContractsAsync: async () => ({ contracts: [{ contractId: "c2" }] }),
      streamTransactionsAsync: async () => [{ transactionId: "grpc-tx-1" }]
    });

    const jsonContracts = new ContractsClient(jsonTransport);
    const grpcContracts = new ContractsClient(grpcTransport);
    const jsonEvents = new EventsClient(jsonTransport);
    const grpcEvents = new EventsClient(grpcTransport);

    await expect(
      jsonContracts.queryAsync(new QueryContractsRequest({ templateId: "Main:Iou" }))
    ).resolves.toBeInstanceOf(QueryContractsResponse);
    await expect(
      grpcContracts.queryAsync(new QueryContractsRequest({ templateId: "Main:Iou" }))
    ).resolves.toBeInstanceOf(QueryContractsResponse);

    const nextAsync = vi.fn(async () => undefined);
    await jsonEvents.streamTransactionsAsync(new StreamTransactionsRequest(), { nextAsync });
    await grpcEvents.streamTransactionsAsync(new StreamTransactionsRequest(), { nextAsync });

    expect(nextAsync).toHaveBeenCalledWith({ transactionId: "json-tx-1" });
    expect(nextAsync).toHaveBeenCalledWith({ transactionId: "grpc-tx-1" });
  });
});
