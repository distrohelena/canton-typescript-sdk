import { describe, expect, it } from "vitest";
import {
    CreateCommand,
    QueryContractsRequest,
    StreamTransactionsRequest,
    SubmitCommandRequest,
} from "../../../src";
import { createFakeGrpcOperations } from "../../fixtures/fake-grpc-services.js";
import { GrpcTransport } from "../../../src/transports/grpc/grpc-transport.js";

describe("GrpcTransport live ledger shapes", () => {
    it("submits real ledger-shaped requests through grpc operations", async () => {
        let capturedQuery: unknown,
            capturedStream: unknown,
            capturedSubmit: unknown;

        const transport = new GrpcTransport(
            createFakeGrpcOperations({
                queryContractsAsync: async request => {
                    capturedQuery = request;

                    return { activeContracts: [] };
                },
                streamTransactionsAsync: async request => {
                    capturedStream = request;

                    return [];
                },
                submitCommandAsync: async request => {
                    capturedSubmit = request;

                    return { updateId: "tx-1", completionOffset: "10" };
                },
            }),
        );

        await transport.queryContractsAsync(
            new QueryContractsRequest({
                party: "Alice",
                templateId: "Main:Iou",
            }),
        );

        await transport.streamTransactionsAsync(
            new StreamTransactionsRequest({
                party: "Alice",
                beginOffset: "0",
                endOffset: "10",
                templateId: "Main:Iou",
            }),
            {
                nextAsync: async () => undefined,
            },
        );

        const result = await transport.submitCommandAsync(
            new SubmitCommandRequest({
                applicationId: "app-1",
                actAs: ["Alice"],
                readAs: ["Bob"],
                command: new CreateCommand({
                    templateId: "Main:Iou",
                    payload: { issuer: "Alice" },
                }),
            }),
        );

        expect(capturedQuery).toMatchObject({
            eventFormat: {
                filtersByParty: {
                    Alice: expect.any(Object),
                },
            },
        });
        expect(capturedStream).toMatchObject({
            beginExclusive: "0",
            endInclusive: "10",
            updateFormat: expect.any(Object),
        });
        expect(capturedSubmit).toMatchObject({
            commands: {
                actAs: ["Alice"],
                readAs: ["Bob"],
                commands: expect.any(Array),
                commandId: expect.any(String),
            },
        });
        expect(result.transactionId).toBe("tx-1");
    });
});
