import { describe, expect, it } from "vitest";
import {
    CreateAndExerciseCommand,
    CreateCommand,
    DamlNumeric,
    DamlParty,
    ExerciseByKeyCommand,
    ExerciseCommand,
    SubmitCommandRequest,
} from "../../../src";
import { mapGrpcSubmitCommandRequest } from "../../../src/transports/grpc/mappers/commands-mapper.js";

describe("grpc command mapper", () => {
    it("maps create commands", () => {
        const payload = mapGrpcSubmitCommandRequest(
            new SubmitCommandRequest({
                applicationId: "app-1",
                userId: "wallet-user",
                actAs: ["Alice"],
                readAs: ["Bob"],
                command: new CreateCommand({
                    templateId: "Main:Iou",
                    payload: {
                        issuer: "Alice",
                        amount: 10,
                    },
                }),
            }),
        );

        expect(payload).toMatchObject({
            commands: {
                actAs: ["Alice"],
                readAs: ["Bob"],
                userId: "wallet-user",
                commandId: expect.any(String),
                commands: [
                    {
                        command: {
                            oneofKind: "create",
                            create: {
                                templateId: {
                                    packageId: "",
                                    moduleName: "Main",
                                    entityName: "Iou",
                                },
                            },
                        },
                    },
                ],
            },
        });
    });

    it("preserves explicit DAML party and numeric value kinds", () => {
        const payload = mapGrpcSubmitCommandRequest(
            new SubmitCommandRequest({
                applicationId: "app-1",
                actAs: ["Alice"],
                command: new CreateCommand({
                    templateId: "Main:Iou",
                    payload: {
                        issuer: new DamlParty("Alice"),
                        amount: new DamlNumeric("10.50"),
                    },
                }),
            }),
        );

        expect(payload.commands.commands[0]).toMatchObject({
            command: {
                oneofKind: "create",
                create: {
                    createArguments: {
                        fields: [
                            { label: "issuer", value: { sum: { oneofKind: "party", party: "Alice" } } },
                            { label: "amount", value: { sum: { oneofKind: "numeric", numeric: "10.50" } } },
                        ],
                    },
                },
            },
        });
    });

    it("maps exercise commands", () => {
        const payload = mapGrpcSubmitCommandRequest(
            new SubmitCommandRequest({
                applicationId: "app-1",
                userId: "wallet-user",
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

        expect(payload.commands.commands[0]).toMatchObject({
            command: {
                oneofKind: "exercise",
                exercise: {
                    templateId: {
                        packageId: "",
                        moduleName: "Main",
                        entityName: "Vault",
                    },
                    contractId: "00abc",
                    choice: "Deposit",
                },
            },
        });
        expect(payload.commands.userId).toBe("wallet-user");
    });

    it("maps exercise-by-key commands", () => {
        const payload = mapGrpcSubmitCommandRequest(
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

        expect(payload.commands.commands[0]).toMatchObject({
            command: {
                oneofKind: "exerciseByKey",
                exerciseByKey: {
                    templateId: {
                        packageId: "",
                        moduleName: "Main",
                        entityName: "Vault",
                    },
                    choice: "Redeem",
                },
            },
        });
    });

    it("maps create-and-exercise commands", () => {
        const payload = mapGrpcSubmitCommandRequest(
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

        expect(payload.commands.commands[0]).toMatchObject({
            command: {
                oneofKind: "createAndExercise",
                createAndExercise: {
                    templateId: {
                        packageId: "",
                        moduleName: "Main",
                        entityName: "VaultFactory",
                    },
                    choice: "CreateVault",
                },
            },
        });
    });
});
