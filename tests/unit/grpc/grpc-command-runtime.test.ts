import { describe, expect, it } from "vitest";
import {
    CreateCommand,
    DamlRecord,
    ExerciseCommand,
    SignCommandResult,
    GetActiveContractsPageRequest,
    SubmitCommandRequest,
} from "../../../src";
import { GetUpdatesRequest } from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js";
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
                streamTransactionsAsync: request => {
                    capturedStream = request;
                    return (async function* () {})();
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

        for await (const _update of transport.getUpdatesAsync(
            GetUpdatesRequest.create({ beginExclusive: "0", endInclusive: "10" }),
        )) { /* exhaust */ }

        const result = await transport.submitCommandAsync(
            new SubmitCommandRequest({
                applicationId: "app-1",
                actAs: ["Alice"],
                readAs: ["Bob"],
                command: new ExerciseCommand({
                    templateId: { packageId: "", moduleName: "Main", entityName: "Iou" },
                    contractId: "00abc",
                    choice: "Archive",
                choiceArgument: {},
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
                    templateId: { packageId: "", moduleName: "Main", entityName: "Iou" },
                    createArguments: new DamlRecord({ issuer: "Alice" }),
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

    it("exposes prepared transactions for detached multi-party signing", async () => {
        let execute: unknown;

        const transport = new GrpcTransport(createFakeGrpcOperations({
            prepareSubmissionAsync: async () => ({ preparedTransaction: {}, preparedTransactionHash: new Uint8Array([7, 8]), hashingSchemeVersion: 3 }),
            executeSubmissionAndWaitAsync: async request => {
                execute = request;

                return { updateId: "tx-detached", completionOffset: "1" };
            },
        }));

        const prepared = await transport.prepareCommandAsync(new SubmitCommandRequest({ applicationId: "app", actAs: ["Alice", "Bob"], readAs: ["Observer"], synchronizerId: "sync", command: new CreateCommand({ templateId: { packageId: "", moduleName: "Main", entityName: "Iou" }, createArguments: new DamlRecord({}) }) }));

        expect(prepared.transactionHash).toEqual(new Uint8Array([7, 8]));
        await transport.executePreparedCommandAndWaitAsync(prepared, {
            Alice: new SignCommandResult({ algorithm: "ed25519", signature: new Uint8Array([1]), signedBy: "alice-key" }),
            Bob: new SignCommandResult({ algorithm: "ed25519", signature: new Uint8Array([2]), signedBy: "bob-key" }),
        });
        expect(execute).toMatchObject({ partySignatures: { signatures: [{ party: "Alice" }, { party: "Bob" }] } });
    });

    it("returns transaction events from the transaction-returning submission endpoint", async () => {
        const transport = new GrpcTransport(createFakeGrpcOperations({
            submitCommandForTransactionAsync: async () => ({ transaction: { updateId: "tx-events", events: [{ created: { contractId: "cid" } }] } }),
        }));

        await expect(transport.submitCommandForTransactionAsync(new SubmitCommandRequest({ applicationId: "app", actAs: ["Alice"], command: new CreateCommand({ templateId: { packageId: "", moduleName: "Main", entityName: "Iou" }, createArguments: new DamlRecord({}) }) }))).resolves.toMatchObject({ transactionId: "tx-events", events: [{ created: { contractId: "cid" } }] });
    });
});
