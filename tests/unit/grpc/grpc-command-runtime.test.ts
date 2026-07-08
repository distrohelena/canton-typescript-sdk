import { describe, expect, it } from "vitest";
import {
    CreateCommand,
    GetActiveContractsPageRequest,
    GetUpdatesRequest,
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

                    return {
                        activeContracts: [],
                        activeAtOffset: "42",
                        nextPageToken: new Uint8Array([1, 2, 3]),
                    };
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

        const activeContractsPage = await transport.getActiveContractsPageAsync(
            new GetActiveContractsPageRequest({
                party: "Alice",
                templateId: "Main:Iou",
                interfaceId: "Main:IAsset",
                includeInterfaceView: true,
                includeCreatedEventBlob: true,
                activeAtOffset: "42",
                maxPageSize: 100,
                pageToken: new Uint8Array([9, 8, 7]),
            }),
        );

        await transport.getUpdatesAsync(
            new GetUpdatesRequest({
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
            activeAtOffset: "42",
            maxPageSize: 100,
            pageToken: new Uint8Array([9, 8, 7]),
            eventFormat: {
                filtersByParty: {
                    Alice: {
                        cumulative: [
                            {
                                identifierFilter: {
                                    oneofKind: "templateFilter",
                                    templateFilter: {
                                        templateId: {
                                            packageId: "",
                                            moduleName: "Main",
                                            entityName: "Iou",
                                        },
                                        includeCreatedEventBlob: true,
                                    },
                                },
                            },
                            {
                                identifierFilter: {
                                    oneofKind: "interfaceFilter",
                                    interfaceFilter: {
                                        interfaceId: {
                                            packageId: "",
                                            moduleName: "Main",
                                            entityName: "IAsset",
                                        },
                                        includeInterfaceView: true,
                                        includeCreatedEventBlob: true,
                                    },
                                },
                            },
                        ],
                    },
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
        expect(activeContractsPage.activeAtOffset).toBe("42");
        expect(activeContractsPage.nextPageToken).toEqual(
            new Uint8Array([1, 2, 3]),
        );
        expect(result.transactionId).toBe("tx-1");
    });
});
