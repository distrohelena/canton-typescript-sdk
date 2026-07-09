import { describe, expect, it } from "vitest";
import {
    CreateAndExerciseCommand,
    CreateCommand,
    ExerciseByKeyCommand,
    ExerciseCommand,
    SubmitCommandRequest,
    ValidationError,
} from "../../../src";

describe("ledger command sdk types", () => {
    it("stores exercise command fields", () => {
        const command = new ExerciseCommand({
            templateId: "Main:Vault",
            contractId: "00abc",
            choice: "Deposit",
            argument: { amount: "10.0" },
        });

        expect(command.templateId).toBe("Main:Vault");
        expect(command.contractId).toBe("00abc");
        expect(command.choice).toBe("Deposit");
        expect(command.argument).toEqual({ amount: "10.0" });
    });

    it("stores exercise-by-key command fields", () => {
        const command = new ExerciseByKeyCommand({
            templateId: "Main:Vault",
            contractKey: { issuer: "Alice", id: "vault-1" },
            choice: "Redeem",
            argument: { amount: "5.0" },
        });

        expect(command.contractKey).toEqual({
            issuer: "Alice",
            id: "vault-1",
        });
    });

    it("stores create-and-exercise command fields", () => {
        const command = new CreateAndExerciseCommand({
            templateId: "Main:VaultFactory",
            payload: { owner: "Alice" },
            choice: "CreateVault",
            argument: { currency: "USD" },
        });

        expect(command.payload).toEqual({ owner: "Alice" });
        expect(command.choice).toBe("CreateVault");
    });

    it("accepts every command kind in submit requests", () => {
        const requests = [
            new SubmitCommandRequest({
                applicationId: "app-1",
                actAs: ["Alice"],
                command: new CreateCommand({
                    templateId: "Main:Iou",
                    payload: {},
                }),
            }),
            new SubmitCommandRequest({
                applicationId: "app-1",
                actAs: ["Alice"],
                command: new ExerciseCommand({
                    templateId: "Main:Iou",
                    contractId: "00abc",
                    choice: "Archive",
                    argument: {},
                }),
            }),
            new SubmitCommandRequest({
                applicationId: "app-1",
                actAs: ["Alice"],
                command: new ExerciseByKeyCommand({
                    templateId: "Main:Iou",
                    contractKey: { owner: "Alice" },
                    choice: "Archive",
                    argument: {},
                }),
            }),
            new SubmitCommandRequest({
                applicationId: "app-1",
                actAs: ["Alice"],
                command: new CreateAndExerciseCommand({
                    templateId: "Main:IouFactory",
                    payload: {},
                    choice: "CreateAndArchive",
                    argument: {},
                }),
            }),
        ];

        expect(requests).toHaveLength(4);
    });

    it("rejects empty required command fields", () => {
        expect(
            () =>
                new ExerciseCommand({
                    templateId: "",
                    contractId: "00abc",
                    choice: "Archive",
                    argument: {},
                }),
        ).toThrow(ValidationError);
    });
});
