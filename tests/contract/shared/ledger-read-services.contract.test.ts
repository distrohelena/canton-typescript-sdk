import { describe, expect, it, vi } from "vitest";
import {
    GetActiveContractsPageRequest,
    GetActiveContractsPageResponse,
    GetActiveContractsRequest,
    GetUpdatesRequest,
    NotSupportedError,
} from "../../../src";
import { StateServiceClient } from "../../../src/services/state/state-service-client.js";
import { UpdateServiceClient } from "../../../src/services/update/update-service-client.js";
import { GrpcTransport } from "../../../src/transports/grpc/grpc-transport.js";
import { JsonTransport } from "../../../src/transports/json/json-transport.js";

describe("shared ledger read services contract", () => {
    it("supports query and event reads on json and grpc transports", async () => {
        const capturedJsonBodies: Record<string, unknown> = {};

        const jsonQueryNextAsync = vi.fn(async () => undefined);

        const grpcEventNextAsync = vi.fn(async () => undefined);

        const jsonTransport = new JsonTransport({
            getAsync: async () => ({ status: "healthy" }),
            postAsync: async (path: string, body: unknown) => {
                capturedJsonBodies[path] = body;

                if (path === "/v1/query") {
                    return { result: [{ contractId: "c1" }] };
                } else if (path === "/v1/stream/query") {
                    return { events: [{ contractId: "json-c1" }] };
                }

                return {};
            },
        });

        const grpcTransport = new GrpcTransport({
            getHealthAsync: async () => ({ status: "healthy" }),
            createPartyAsync: async () => ({ identifier: "unused" }),
            listPartiesAsync: async () => ({
                partyDetails: [],
                nextPageToken: "",
            }),
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

        const jsonStateService = new StateServiceClient(jsonTransport);

        const grpcStateService = new StateServiceClient(grpcTransport);

        const jsonUpdateService = new UpdateServiceClient(jsonTransport);

        const grpcUpdateService = new UpdateServiceClient(grpcTransport);

        await expect(
            jsonStateService.getActiveContractsPageAsync(
                new GetActiveContractsPageRequest({
                    party: "Alice",
                    templateId: "Main:Iou",
                }),
            ),
        ).resolves.toBeInstanceOf(GetActiveContractsPageResponse);
        await expect(
            grpcStateService.getActiveContractsPageAsync(
                new GetActiveContractsPageRequest({
                    party: "Alice",
                    templateId: "Main:Iou",
                }),
            ),
        ).resolves.toBeInstanceOf(GetActiveContractsPageResponse);
        await expect(
            grpcStateService.getActiveContractsAsync(
                new GetActiveContractsRequest({
                    party: "Alice",
                    templateId: "Main:Iou",
                }),
                { nextAsync: vi.fn(async () => undefined) },
            ),
        ).rejects.toThrow(NotSupportedError);

        await jsonStateService.getActiveContractsAsync(
            new GetActiveContractsRequest({
                party: "Alice",
                templateId: "Main:Iou",
            }),
            { nextAsync: jsonQueryNextAsync },
        );
        await expect(
            jsonUpdateService.getUpdatesAsync(
                new GetUpdatesRequest({
                    party: "Alice",
                    templateId: "Main:Iou",
                }),
                { nextAsync: vi.fn(async () => undefined) },
            ),
        ).rejects.toThrow(NotSupportedError);
        await grpcUpdateService.getUpdatesAsync(
            new GetUpdatesRequest({
                party: "Alice",
                templateId: "Main:Iou",
            }),
            { nextAsync: grpcEventNextAsync },
        );

        expect(capturedJsonBodies["/v1/query"]).toEqual({
            templateIds: ["Main:Iou"],
        });
        expect(capturedJsonBodies["/v1/stream/query"]).toEqual({
            party: "Alice",
            templateIds: ["Main:Iou"],
        });
        expect(jsonQueryNextAsync).toHaveBeenCalledWith({
            contractId: "json-c1",
        });
        expect(grpcEventNextAsync).toHaveBeenCalledWith({
            transactionId: "grpc-tx-1",
        });
    });
});
