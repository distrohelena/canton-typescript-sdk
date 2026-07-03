import { describe, expect, it, vi } from "vitest";
import {
    QueryContractsRequest,
    QueryContractsResponse,
    StreamTransactionsRequest,
} from "../../../src";
import { ContractsClient } from "../../../src/services/contracts/contracts-client.js";
import { EventsClient } from "../../../src/services/events/events-client.js";
import { GrpcTransport } from "../../../src/transports/grpc/grpc-transport.js";
import { JsonTransport } from "../../../src/transports/json/json-transport.js";

describe("shared ledger read services contract", () => {
    it("supports query and event reads on json and grpc transports", async () => {
        const capturedJsonBodies: Record<string, unknown> = {};

        const jsonTransport = new JsonTransport({
            getAsync: async () => ({ status: "healthy" }),
            postAsync: async (path: string, body: unknown) => {
                capturedJsonBodies[path] = body;

                if (path === "/v1/query") {
                    return { result: [{ contractId: "c1" }] };
                } else if (path === "/v1/stream/query") {
                    return { events: [{ transactionId: "json-tx-1" }] };
                }

                return {};
            },
        });

        const grpcTransport = new GrpcTransport({
            getHealthAsync: async () => ({ status: "healthy" }),
            createPartyAsync: async () => ({ identifier: "unused" }),
            grantUserRightsAsync: async () => ({ rights: [] }),
            uploadPackageAsync: async () => ({ packageId: "unused" }),
            queryContractsAsync: async () => ({
                activeContracts: [
                    {
                        contractEntry: {
                            oneofKind: "activeContract",
                            activeContract: { contractId: "c2" },
                        },
                    },
                ],
            }),
            streamTransactionsAsync: async () => [
                {
                    update: {
                        oneofKind: "transaction",
                        transaction: { transactionId: "grpc-tx-1" },
                    },
                },
            ],
        });

        const jsonContracts = new ContractsClient(jsonTransport);

        const grpcContracts = new ContractsClient(grpcTransport);

        const jsonEvents = new EventsClient(jsonTransport);

        const grpcEvents = new EventsClient(grpcTransport);

        await expect(
            jsonContracts.queryAsync(
                new QueryContractsRequest({
                    party: "Alice",
                    templateId: "Main:Iou",
                }),
            ),
        ).resolves.toBeInstanceOf(QueryContractsResponse);
        await expect(
            grpcContracts.queryAsync(
                new QueryContractsRequest({
                    party: "Alice",
                    templateId: "Main:Iou",
                }),
            ),
        ).resolves.toBeInstanceOf(QueryContractsResponse);

        const nextAsync = vi.fn(async () => undefined);

        await jsonEvents.streamTransactionsAsync(
            new StreamTransactionsRequest({
                party: "Alice",
                templateId: "Main:Iou",
            }),
            { nextAsync },
        );
        await grpcEvents.streamTransactionsAsync(
            new StreamTransactionsRequest({
                party: "Alice",
                templateId: "Main:Iou",
            }),
            { nextAsync },
        );

        expect(capturedJsonBodies["/v1/query"]).toEqual({
            templateIds: ["Main:Iou"],
        });
        expect(capturedJsonBodies["/v1/stream/query"]).toEqual({
            party: "Alice",
            templateIds: ["Main:Iou"],
        });
        expect(nextAsync).toHaveBeenCalledWith({ transactionId: "json-tx-1" });
        expect(nextAsync).toHaveBeenCalledWith({ transactionId: "grpc-tx-1" });
    });
});
