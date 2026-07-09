import { describe, expect, it } from "vitest";
import {
    CreateAndExerciseCommand,
    CreateCommand,
    ExerciseByKeyCommand,
    ExerciseCommand,
    SubmitCommandRequest,
} from "../../../src";
import {
    mapJsonSubmitCommand,
    mapJsonSubmitCommandRequest,
} from "../../../src/transports/json/mappers/commands-mapper.js";

describe("json command submission mapper", () => {
    it("maps create commands to the V2 JsCommands payload", () => {
        const payload = mapJsonSubmitCommandRequest(
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
            ],
        });
    });

    it("maps exercise commands to the V2 JsCommands payload", () => {
        const payload = mapJsonSubmitCommandRequest(
            new SubmitCommandRequest({
                applicationId: "app-1",
                actAs: ["Alice"],
                command: new ExerciseCommand({
                    templateId: "Main:Vault",
                    contractId: "00abc",
                    choice: "Deposit",
                    argument: {
                        amount: "10.0",
                    },
                }),
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
        const byKeyPayload = mapJsonSubmitCommandRequest(
            new SubmitCommandRequest({
                applicationId: "app-1",
                actAs: ["Alice"],
                command: new ExerciseByKeyCommand({
                    templateId: "Main:Vault",
                    contractKey: {
                        owner: "Alice",
                        id: "vault-1",
                    },
                    choice: "Redeem",
                    argument: {
                        amount: "5.0",
                    },
                }),
            }),
        );

        const createAndExercisePayload = mapJsonSubmitCommandRequest(
            new SubmitCommandRequest({
                applicationId: "app-1",
                actAs: ["Alice"],
                command: new CreateAndExerciseCommand({
                    templateId: "Main:VaultFactory",
                    payload: {
                        owner: "Alice",
                    },
                    choice: "CreateVault",
                    argument: {
                        currency: "USD",
                    },
                }),
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
});
