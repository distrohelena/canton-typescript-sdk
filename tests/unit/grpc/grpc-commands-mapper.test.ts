import { describe, expect, it } from "vitest";
import {
    CreateAndExerciseCommand,
    CreateCommand,
    DamlRecord,
    DamlContractId,
    DamlNumeric,
    DamlParty,
    ExerciseByKeyCommand,
    ExerciseCommand,
    SubmitCommandRequest,
} from "../../../src";
import {
    mapGrpcSubmitCommandForTransactionRequest,
    mapGrpcSubmitCommandRequest,
} from "../../../src/transports/grpc/mappers/commands-mapper.js";

describe("grpc command mapper", () => {
    it("maps create commands", () => {
        const payload = mapGrpcSubmitCommandRequest(
            new SubmitCommandRequest({
                applicationId: "app-1",
                userId: "wallet-user",
                actAs: ["Alice"],
                readAs: ["Bob"],
                command: new CreateCommand({
                    templateId: { packageId: "", moduleName: "Main", entityName: "Iou" },
                    createArguments: new DamlRecord({
                        issuer: "Alice",
                        amount: 10,
                    }),
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
        expect(payload.commands.deduplicationPeriod).toEqual({
            oneofKind: undefined,
        });
    });

    it("maps caller-controlled command IDs and duration deduplication", () => {
        const payload = mapGrpcSubmitCommandRequest(
            new SubmitCommandRequest({
                applicationId: "app-1",
                actAs: ["Alice"],
                commandId: "retry-command-1",
                deduplicationPeriod: { kind: "duration", seconds: 30 },
                command: new CreateCommand({
                    templateId: { packageId: "", moduleName: "Main", entityName: "Iou" },
                    createArguments: new DamlRecord({}),
                }),
            }),
        );

        expect(payload.commands.commandId).toBe("retry-command-1");
        expect(payload.commands.deduplicationPeriod).toEqual({
            oneofKind: "deduplicationDuration",
            deduplicationDuration: { seconds: "30", nanos: 0 },
        });
    });

    it("maps participant-begin offsets for normal submission endpoints", () => {
        const request = new SubmitCommandRequest({
            applicationId: "app-1",
            actAs: ["Alice"],
            deduplicationPeriod: { kind: "offset", offset: "0" },
            command: new CreateCommand({
                templateId: { packageId: "", moduleName: "Main", entityName: "Iou" },
                createArguments: new DamlRecord({}),
            }),
        });

        expect(mapGrpcSubmitCommandRequest(request).commands.deduplicationPeriod).toEqual({
            oneofKind: "deduplicationOffset",
            deduplicationOffset: "0",
        });
        expect(mapGrpcSubmitCommandForTransactionRequest(request).commands.deduplicationPeriod).toEqual({
            oneofKind: "deduplicationOffset",
            deduplicationOffset: "0",
        });
    });

    it("preserves explicit DAML party, numeric, and contract-id value kinds", () => {
        const payload = mapGrpcSubmitCommandRequest(
            new SubmitCommandRequest({
                applicationId: "app-1",
                actAs: ["Alice"],
                command: new CreateCommand({
                    templateId: { packageId: "", moduleName: "Main", entityName: "Iou" },
                    createArguments: new DamlRecord({
                        issuer: new DamlParty("Alice"),
                        amount: new DamlNumeric("10.50"),
                        referenced: new DamlContractId("00abc"),
                    }),
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
                            { label: "referenced", value: { sum: { oneofKind: "contractId", contractId: "00abc" } } },
                        ],
                    },
                },
            },
        });
    });

    it("preserves record IDs on top-level create arguments", () => {
        const payload = mapGrpcSubmitCommandRequest(
            new SubmitCommandRequest({
                applicationId: "app-1",
                actAs: ["Alice"],
                command: new CreateCommand({
                    templateId: { packageId: "", moduleName: "Main", entityName: "Iou" },
                    createArguments: new DamlRecord(
                        { issuer: "Alice" },
                        { packageId: "pkg-id", moduleName: "Main", entityName: "IouArguments" },
                    ),
                }),
            }),
        );

        expect(payload.commands.commands[0]).toMatchObject({
            command: {
                create: {
                    createArguments: {
                        recordId: {
                            packageId: "pkg-id",
                            moduleName: "Main",
                            entityName: "IouArguments",
                        },
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
                    templateId: { packageId: "", moduleName: "Main", entityName: "Vault" },
                    contractId: "00abc",
                    choice: "Deposit",
                    choiceArgument: {
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
