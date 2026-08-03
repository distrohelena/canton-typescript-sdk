import { describe, expect, it, vi } from "vitest";
import {
    CommandServiceClient,
    CreateAndExerciseCommand,
    CreateCommand,
    DamlRecord,
    DamlNumeric,
    DamlParty,
    ExerciseByKeyCommand,
    ExerciseCommand,
    RequestOptions,
    SubmitCommandsRequest,
} from "../../../src";
import {
    mapJsonSubmitCommand,
    mapJsonSubmitCommandsRequest,
} from "../../../src/transports/json/mappers/commands-mapper.js";
import { TransportError } from "../../../src/core/errors/transport-error.js";
import { JsonTransport } from "../../../src/transports/json/json-transport.js";

describe("json command submission mapper", () => {
    it("maps ordered create and exercise commands to the V2 JsCommands payload", () => {
        const payload = mapJsonSubmitCommandsRequest(
            new SubmitCommandsRequest({
                applicationId: "app-1",
                actAs: ["Alice"],
                readAs: ["Bob"],
                commands: [
                    new CreateCommand({
                        templateId: { packageId: "", moduleName: "Main", entityName: "Iou" },
                        createArguments: new DamlRecord({ issuer: "Alice", owner: "Bob" }),
                    }),
                    new ExerciseCommand({
                        templateId: { packageId: "", moduleName: "Main", entityName: "Vault" },
                        contractId: "00abc",
                        choice: "Deposit",
                        choiceArgument: {},
                    }),
                ],
            }),
        );

        expect(payload).toMatchObject({
            commandId: expect.any(String),
            actAs: ["Alice"],
            readAs: ["Bob"],
            commands: [
                {
                    CreateCommand: {
                        templateId: "Main:Iou",
                        createArguments: {
                            issuer: "Alice",
                            owner: "Bob",
                        },
                    },
                },
                {
                    ExerciseCommand: {
                        templateId: "Main:Vault",
                        contractId: "00abc",
                        choice: "Deposit",
                        choiceArgument: {},
                    },
                },
            ],
        });
    });

    it("preserves explicit command IDs", () => {
        const payload = mapJsonSubmitCommandsRequest(
            new SubmitCommandsRequest({
                applicationId: "app-1",
                actAs: ["Alice"],
                commandId: "retry-command-1",
                commands: [new CreateCommand({
                    templateId: { packageId: "", moduleName: "Main", entityName: "Iou" },
                    createArguments: new DamlRecord({}),
                })],
            }),
        );

        expect(payload.commandId).toBe("retry-command-1");
    });

    it("generates a nonempty command ID when none is provided", () => {
        const payload = mapJsonSubmitCommandsRequest(
            new SubmitCommandsRequest({
                applicationId: "app-1",
                actAs: ["Alice"],
                commands: [new CreateCommand({
                    templateId: { packageId: "", moduleName: "Main", entityName: "Iou" },
                    createArguments: new DamlRecord({}),
                })],
            }),
        );

        expect(payload.commandId).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        );
    });

    it.each([
        { kind: "duration" as const, seconds: 30 },
        { kind: "offset" as const, offset: "10" },
    ])("rejects unsupported command deduplication periods: %o", deduplicationPeriod => {
        const request = new SubmitCommandsRequest({
            applicationId: "app-1",
            actAs: ["Alice"],
            deduplicationPeriod,
            commands: [new CreateCommand({
                templateId: { packageId: "", moduleName: "Main", entityName: "Iou" },
                createArguments: new DamlRecord({}),
            })],
        });

        expect(() => mapJsonSubmitCommandsRequest(request)).toThrow(TransportError);
        expect(() => mapJsonSubmitCommandsRequest(request)).toThrow(
            "command deduplication periods are not supported by the JSON transport",
        );
    });

    it("rejects deduplication before issuing JSON HTTP requests", async () => {
        let postAsyncCalls = 0;

        const transport = new JsonTransport({
            getAsync: async () => ({}),
            postAsync: async () => {
                postAsyncCalls += 1;

                return {};
            },
        });

        const submission = transport.submitCommandAsync(
            new SubmitCommandsRequest({
                applicationId: "app-1",
                actAs: ["Alice"],
                deduplicationPeriod: { kind: "duration", seconds: 30 },
                commands: [new CreateCommand({
                    templateId: {
                        packageId: "",
                        moduleName: "Main",
                        entityName: "Iou",
                    },
                    createArguments: new DamlRecord({}),
                })],
            }),
        );

        await expect(submission).rejects.toThrow(TransportError);
        await expect(submission).rejects.toThrow(
            "command deduplication periods are not supported by the JSON transport",
        );
        expect(postAsyncCalls).toBe(0);
    });

    it("unwraps explicit DAML party and numeric values for JSON commands", () => {
        const payload = mapJsonSubmitCommandsRequest(
            new SubmitCommandsRequest({
                applicationId: "app-1",
                actAs: ["Alice"],
                commands: [new CreateCommand({
                    templateId: { packageId: "", moduleName: "Main", entityName: "Iou" },
                    createArguments: new DamlRecord({
                        issuer: new DamlParty("Alice"),
                        amount: new DamlNumeric("10.50"),
                    }),
                })],
            }),
        );

        expect(payload.commands[0]).toEqual({
            CreateCommand: {
                templateId: "Main:Iou",
                createArguments: { issuer: "Alice", amount: "10.50" },
            },
        });
    });

    it("formats package-qualified template IDs only at the JSON boundary", () => {
        const payload = mapJsonSubmitCommandsRequest(
            new SubmitCommandsRequest({
                applicationId: "app-1",
                actAs: ["Alice"],
                commands: [new CreateCommand({
                    templateId: {
                        packageId: "pkg-id",
                        moduleName: "Main",
                        entityName: "Iou",
                    },
                    createArguments: new DamlRecord({}),
                })],
            }),
        );

        expect(payload.commands[0]).toEqual({
            CreateCommand: {
                templateId: "pkg-id:Main:Iou",
                createArguments: {},
            },
        });
    });

    it("maps exercise commands to the V2 JsCommands payload", () => {
        const payload = mapJsonSubmitCommandsRequest(
            new SubmitCommandsRequest({
                applicationId: "app-1",
                actAs: ["Alice"],
                commands: [new ExerciseCommand({
                    templateId: { packageId: "", moduleName: "Main", entityName: "Vault" },
                    contractId: "00abc",
                    choice: "Deposit",
                    choiceArgument: {
                        amount: "10.0",
                    },
                })],
            }),
        );

        expect(payload.commands[0]).toEqual({
            ExerciseCommand: {
                templateId: "Main:Vault",
                contractId: "00abc",
                choice: "Deposit",
                choiceArgument: {
                    amount: "10.0",
                },
            },
        });
    });

    it("maps exercise-by-key and create-and-exercise commands", () => {
        const byKeyPayload = mapJsonSubmitCommandsRequest(
            new SubmitCommandsRequest({
                applicationId: "app-1",
                actAs: ["Alice"],
                commands: [new ExerciseByKeyCommand({
                    templateId: { packageId: "", moduleName: "Main", entityName: "Vault" },
                    contractKey: {
                        owner: "Alice",
                        id: "vault-1",
                    },
                    choice: "Redeem",
                    choiceArgument: {
                        amount: "5.0",
                    },
                })],
            }),
        );

        const createAndExercisePayload = mapJsonSubmitCommandsRequest(
            new SubmitCommandsRequest({
                applicationId: "app-1",
                actAs: ["Alice"],
                commands: [new CreateAndExerciseCommand({
                    templateId: { packageId: "", moduleName: "Main", entityName: "VaultFactory" },
                    createArguments: new DamlRecord({
                        owner: "Alice",
                    }),
                    choice: "CreateVault",
                    choiceArgument: {
                        currency: "USD",
                    },
                })],
            }),
        );

        expect(byKeyPayload.commands[0]).toEqual({
            ExerciseByKeyCommand: {
                templateId: "Main:Vault",
                contractKey: {
                    owner: "Alice",
                    id: "vault-1",
                },
                choice: "Redeem",
                choiceArgument: {
                    amount: "5.0",
                },
            },
        });
        expect(createAndExercisePayload.commands[0]).toEqual({
            CreateAndExerciseCommand: {
                templateId: "Main:VaultFactory",
                createArguments: {
                    owner: "Alice",
                },
                choice: "CreateVault",
                choiceArgument: {
                    currency: "USD",
                },
            },
        });
    });

    it("maps updateId-based responses onto the SDK response type", () => {
        const response = mapJsonSubmitCommand({
            updateId: "tx-1",
            completionOffset: "10",
        });

        expect(response.transactionId).toBe("tx-1");
    });

    it("submits participant-local commands through ordinary JSON without signing", async () => {
        const postAsync = vi.fn(async () => ({
            result: {
                commandId: "cmd-local-json",
                updateId: "tx-local-json",
            },
        }));

        const signAsync = vi.fn(async () => {
            throw new Error("external signer must not be called");
        });

        const client = new CommandServiceClient(
            new JsonTransport({
                getAsync: async () => {
                    throw new Error("not used");
                },
                postAsync,
            }),
            { signAsync },
        );

        const request = new SubmitCommandsRequest({
            applicationId: "app-local-json",
            actAs: ["Alice"],
            commandId: "cmd-local-json",
            commands: [new CreateCommand({
                templateId: { packageId: "", moduleName: "Main", entityName: "Iou" },
                createArguments: new DamlRecord({ issuer: "Alice" }),
            })],
        });

        const options = new RequestOptions({ timeoutMs: 250 });

        const result = await client.submitParticipantLocalAndWaitAsync(request, options);

        expect(result).toMatchObject({
            commandId: "cmd-local-json",
            transactionId: "tx-local-json",
        });
        expect(postAsync).toHaveBeenCalledOnce();
        expect(postAsync).toHaveBeenCalledWith(
            "/v2/commands/submit-and-wait",
            {
                commandId: "cmd-local-json",
                actAs: ["Alice"],
                readAs: [],
                commands: [{
                    CreateCommand: {
                        templateId: "Main:Iou",
                        createArguments: { issuer: "Alice" },
                    },
                }],
                applicationId: "app-local-json",
            },
            options,
        );
        expect(signAsync).not.toHaveBeenCalled();
    });
});
