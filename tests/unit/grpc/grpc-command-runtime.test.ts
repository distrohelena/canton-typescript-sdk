import { describe, expect, it } from "vitest";
import {
    CreateCommand,
    ExerciseCommand,
    SignCommandResult,
    GetActiveContractsPageRequest,
    GetUpdatesRequest,
    SubmitCommandRequest,
} from "../../../src";
import { createFakeGrpcOperations } from "../../fixtures/fake-grpc-services.js";
import { GrpcTransport } from "../../../src/transports/grpc/grpc-transport.js";

describe("GrpcTransport live ledger shapes", () => {
    it("exposes interactive submission operations on fake grpc services", () => {
        const operations = createFakeGrpcOperations();

        expect(operations).toHaveProperty("prepareSubmissionAsync");
        expect(operations).toHaveProperty("executeSubmissionAndWaitAsync");
    });

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
                command: new ExerciseCommand({
                    templateId: "Main:Iou",
                    contractId: "00abc",
                    choice: "Archive",
                    argument: {},
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
                commands: [
                    {
                        command: {
                            oneofKind: "exercise",
                            exercise: {
                                contractId: "00abc",
                                choice: "Archive",
                            },
                        },
                    },
                ],
                commandId: expect.any(String),
            },
        });
        expect(activeContractsPage.activeAtOffset).toBe("42");
        expect(activeContractsPage.nextPageToken).toEqual(
            new Uint8Array([1, 2, 3]),
        );
        expect(result.transactionId).toBe("tx-1");
    });

    it("uses interactive grpc submission for signed commands", async () => {
        let capturedPrepare: unknown,
            capturedExecute: unknown,
            signerPayload: Uint8Array | undefined;

        const transport = new GrpcTransport(
            createFakeGrpcOperations({
                prepareSubmissionAsync: async request => {
                    capturedPrepare = request;

                    return {
                        preparedTransaction: {},
                        preparedTransactionHash: new Uint8Array([9, 9, 9]),
                        hashingSchemeVersion: 3,
                    };
                },
                executeSubmissionAndWaitAsync: async request => {
                    capturedExecute = request;

                    return { updateId: "tx-2", completionOffset: "11" };
                },
                submitCommandAsync: async () => {
                    throw new Error("plain submit should not be used");
                },
            }),
        );

        const result = await transport.submitCommandAsync(
            new SubmitCommandRequest({
                applicationId: "app-1",
                userId: "wallet-user",
                actAs: ["Alice"],
                command: new CreateCommand({
                    templateId: "Main:Iou",
                    payload: { issuer: "Alice" },
                }),
            }),
            {
                signAsync: async request => {
                    signerPayload = request.payload;

                    return new SignCommandResult({
                        algorithm: "ed25519",
                        signature: new Uint8Array([1, 2, 3]),
                        signedBy: "fingerprint::1",
                    });
                },
            },
        );

        expect(capturedPrepare).toMatchObject({
            userId: "wallet-user",
            actAs: ["Alice"],
        });
        expect(signerPayload).toEqual(new Uint8Array([9, 9, 9]));
        expect(capturedExecute).toMatchObject({
            userId: "wallet-user",
            submissionId: expect.any(String),
            partySignatures: {
                signatures: [
                    {
                        party: "Alice",
                    },
                ],
            },
        });
        expect(result.transactionId).toBe("tx-2");
    });
});
