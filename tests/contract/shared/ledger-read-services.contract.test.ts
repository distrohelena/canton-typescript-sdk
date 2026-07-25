import { describe, expect, it, vi } from "vitest";
import {
    GetActiveContractsRequest,
    NotSupportedError,
} from "../../../src";
import { GetActiveContractsPageRequest } from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/state_service.js";
import { GetUpdatesRequest } from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js";
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

        const activeContractsPageResponse = {
            activeContracts: [],
            activeAtOffset: "2",
        };
        const grpcTransport = new GrpcTransport({
            getHealthAsync: async () => ({ status: "healthy" }),
            createPartyAsync: async () => ({ identifier: "unused" }),
            listPartiesAsync: async () => ({
                partyDetails: [],
                nextPageToken: "",
            }),
            grantUserRightsAsync: async () => ({ rights: [] }),
            uploadPackageAsync: async () => ({ packageId: "unused" }),
            getActiveContractsPageAsync: async () => activeContractsPageResponse,
            getUpdatesAsync: () => (async function* () { yield {
                update: {
                    oneofKind: "transaction",
                    transaction: { transactionId: "grpc-tx-1" },
                },
            }; })(),
        });

        const jsonStateService = new StateServiceClient(jsonTransport);

        const grpcStateService = new StateServiceClient(grpcTransport);

        const jsonUpdateService = new UpdateServiceClient(jsonTransport);

        const grpcUpdateService = new UpdateServiceClient(grpcTransport);

        await expect(
            jsonStateService.getActiveContractsPageAsync(
                GetActiveContractsPageRequest.create(),
            ),
        ).rejects.toThrow(NotSupportedError);
        await expect(
            grpcStateService.getActiveContractsPageAsync(
                GetActiveContractsPageRequest.create(),
            ),
        ).resolves.toBe(activeContractsPageResponse);
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
            (async () => { for await (const _update of jsonUpdateService.getUpdatesAsync(
                GetUpdatesRequest.create({ beginExclusive: "0" }),
            )) {} })(),
        ).rejects.toThrow(NotSupportedError);
        const grpcUpdates = [];
        for await (const update of grpcUpdateService.getUpdatesAsync(
            GetUpdatesRequest.create({ beginExclusive: "0" }),
        )) grpcUpdates.push(update);

        expect(capturedJsonBodies["/v1/query"]).toBeUndefined();
        expect(capturedJsonBodies["/v1/stream/query"]).toEqual({
            party: "Alice",
            templateIds: ["Main:Iou"],
        });
        expect(jsonQueryNextAsync).toHaveBeenCalledWith({
            contractId: "json-c1",
        });
        expect(grpcUpdates[0]).toMatchObject({ update: { oneofKind: "transaction", transaction: { transactionId: "grpc-tx-1" } } });
    });
});
