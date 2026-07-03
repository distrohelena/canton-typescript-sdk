import { describe, expect, it, vi } from "vitest";
import {
    CreateCommand,
    QueryContractsRequest,
    StreamQueryRequest,
    SubmitCommandRequest,
} from "../../../src";

describe("json transport entrypoint", () => {
    it("exports protocol-specific entrypoints", async () => {
        const jsonModule = await import("../../../src/json/index.js");

        const capturedBodies: Record<string, unknown> = {};

        const client = new jsonModule.JsonLedgerClient(
            {
                getAsync: async () => ({}),
                postAsync: async (path: string, body: unknown) => {
                    capturedBodies[path] = body;

                    if (path === "/v1/query") {
                        return { result: [{ contractId: "c1" }] };
                    }

                    else if (path === "/v1/stream/query") {
                        return { events: [{ contractId: "c2" }] };
                    }

                    else if (path === "/v1/create") {
                        return {
                            result: { commandId: "cmd-1", transactionId: "tx-1" },
                        };
                    }

                    return {};
                },
            },
        );

        expect(jsonModule).toHaveProperty("JsonLedgerClient");

        const nextAsync = vi.fn(async () => undefined);

        await expect(
            client.contracts.queryAsync(
                new QueryContractsRequest({
                    party: "Alice",
                    templateId: "Main:Iou",
                }),
            ),
        ).resolves.toBeDefined();
        await client.contracts.streamQueryAsync(
            new StreamQueryRequest({
                party: "Alice",
                templateId: "Main:Iou",
            }),
            { nextAsync },
        );
        await expect(
            client.commandService.submitAndWaitAsync(
                new SubmitCommandRequest({
                    applicationId: "app-1",
                    actAs: ["Alice"],
                    readAs: ["Bob"],
                    command: new CreateCommand({
                        templateId: "Main:Iou",
                        payload: {
                            issuer: "Alice",
                            owner: "Bob",
                        },
                    }),
                }),
            ),
        ).resolves.toBeDefined();
        expect(capturedBodies["/v1/create"]).toEqual({
            templateId: "Main:Iou",
            payload: {
                issuer: "Alice",
                owner: "Bob",
            },
            applicationId: "app-1",
            actAs: ["Alice"],
            readAs: ["Bob"],
        });
        expect(capturedBodies["/v1/stream/query"]).toEqual({
            party: "Alice",
            templateIds: ["Main:Iou"],
        });
        expect(nextAsync).toHaveBeenCalledWith({ contractId: "c2" });
    });
});
