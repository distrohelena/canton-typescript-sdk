import { describe, expect, it } from "vitest";
import {
    CreateAndExerciseCommand,
    CreateCommand,
    DamlRecord,
    DamlNumeric,
    DamlParty,
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
                    templateId: { packageId: "", moduleName: "Main", entityName: "Iou" },
                    createArguments: new DamlRecord({
                        issuer: "Alice",
                        owner: "Bob",
                    }),
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

    it("unwraps explicit DAML party and numeric values for JSON commands", () => {
        const payload = mapJsonSubmitCommandRequest(
            new SubmitCommandRequest({
                applicationId: "app-1",
                actAs: ["Alice"],
                command: new CreateCommand({
                    templateId: { packageId: "", moduleName: "Main", entityName: "Iou" },
                    createArguments: new DamlRecord({
                        issuer: new DamlParty("Alice"),
                        amount: new DamlNumeric("10.50"),
                    }),
                }),
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
        const payload = mapJsonSubmitCommandRequest(
            new SubmitCommandRequest({
                applicationId: "app-1",
                actAs: ["Alice"],
                command: new CreateCommand({
                    templateId: {
                        packageId: "pkg-id",
                        moduleName: "Main",
                        entityName: "Iou",
                    },
                    createArguments: new DamlRecord({}),
                }),
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
        const payload = mapJsonSubmitCommandRequest(
            new SubmitCommandRequest({
                applicationId: "app-1",
                actAs: ["Alice"],
                command: new ExerciseCommand({
                    templateId: { packageId: "", moduleName: "Main", entityName: "Vault" },
                    contractId: "00abc",
                    choice: "Deposit",
                    choiceArgument: {
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
                    templateId: { packageId: "", moduleName: "Main", entityName: "Vault" },
                    contractKey: {
                        owner: "Alice",
                        id: "vault-1",
                    },
                    choice: "Redeem",
                    choiceArgument: {
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
                    templateId: { packageId: "", moduleName: "Main", entityName: "VaultFactory" },
                    createArguments: new DamlRecord({
                        owner: "Alice",
                    }),
                    choice: "CreateVault",
                    choiceArgument: {
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
