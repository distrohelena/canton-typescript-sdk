import { describe, expect, it } from "vitest";
import {
    CreateAndExerciseCommand,
    CreateCommand,
    DamlRecord,
    ExerciseByKeyCommand,
    ExerciseCommand,
    SubmitCommandRequest,
    TemplateId,
    ValidationError,
} from "../../../src";

const templateId: TemplateId = {
    packageId: "pkg-id",
    moduleName: "Main",
    entityName: "Vault",
};

describe("ledger command sdk types", () => {
    it("stores structured command fields", () => {
        const createArguments = new DamlRecord({ owner: "Alice" });

        const choiceArgument = { amount: "10.0" };

        const create = new CreateCommand({ templateId, createArguments });

        const exercise = new ExerciseCommand({
            templateId,
            contractId: "00abc",
            choice: "Deposit",
            choiceArgument,
        });

        const exerciseByKey = new ExerciseByKeyCommand({
            templateId,
            contractKey: { issuer: "Alice", id: "vault-1" },
            choice: "Redeem",
            choiceArgument,
        });

        const createAndExercise = new CreateAndExerciseCommand({
            templateId,
            createArguments,
            choice: "CreateVault",
            choiceArgument,
        });

        expect(create.templateId).toEqual(templateId);
        expect(create.createArguments).toBe(createArguments);
        expect(exercise.contractId).toBe("00abc");
        expect(exercise.choiceArgument).toBe(choiceArgument);
        expect(exerciseByKey.contractKey).toEqual({
            issuer: "Alice",
            id: "vault-1",
        });
        expect(createAndExercise.createArguments).toBe(createArguments);
    });

    it("allows an empty package ID in template IDs", () => {
        const command = new CreateCommand({
            templateId: { packageId: "", moduleName: "Main", entityName: "Iou" },
            createArguments: new DamlRecord({}),
        });

        expect(command.templateId.packageId).toBe("");
    });

    it.each([
        { packageId: "pkg-id", moduleName: "", entityName: "Iou" },
        { packageId: "pkg-id", moduleName: "Main", entityName: "" },
    ])("rejects malformed template IDs", (invalidTemplateId) => {
        expect(
            () =>
                new CreateCommand({
                    templateId: invalidTemplateId,
                    createArguments: new DamlRecord({}),
                }),
        ).toThrow(ValidationError);
    });

    it("rejects non-DamlRecord create arguments", () => {
        expect(
            () =>
                new CreateCommand({
                    templateId,
                    createArguments: {} as DamlRecord,
                }),
        ).toThrow(ValidationError);
    });

    it("rejects non-DamlRecord create-and-exercise arguments", () => {
        expect(
            () =>
                new CreateAndExerciseCommand({
                    templateId,
                    createArguments: {} as DamlRecord,
                    choice: "CreateVault",
                    choiceArgument: {},
                }),
        ).toThrow(ValidationError);
    });

    it("rejects an exercise-by-key command without a contract key", () => {
        expect(
            () =>
                new ExerciseByKeyCommand({
                    templateId,
                    contractKey: undefined,
                    choice: "Archive",
                    choiceArgument: {},
                }),
        ).toThrow(ValidationError);
    });

    it("rejects an exercise command without a contract ID", () => {
        expect(
            () =>
                new ExerciseCommand({
                    templateId,
                    contractId: "",
                    choice: "Archive",
                    choiceArgument: {},
                }),
        ).toThrow(ValidationError);
    });

    it.each([
        () =>
            new ExerciseCommand({
                templateId,
                contractId: "00abc",
                choice: "",
                choiceArgument: {},
            }),
        () =>
            new ExerciseByKeyCommand({
                templateId,
                contractKey: { owner: "Alice" },
                choice: "",
                choiceArgument: {},
            }),
        () =>
            new CreateAndExerciseCommand({
                templateId,
                createArguments: new DamlRecord({}),
                choice: "",
                choiceArgument: {},
            }),
    ])("rejects a missing choice", (createCommand) => {
        expect(createCommand).toThrow(ValidationError);
    });

    it("accepts every command kind in submit requests", () => {
        const requests = [
            new SubmitCommandRequest({
                applicationId: "app-1",
                actAs: ["Alice"],
                command: new CreateCommand({
                    templateId,
                    createArguments: new DamlRecord({}),
                }),
            }),
            new SubmitCommandRequest({
                applicationId: "app-1",
                actAs: ["Alice"],
                command: new ExerciseCommand({
                    templateId,
                    contractId: "00abc",
                    choice: "Archive",
                    choiceArgument: {},
                }),
            }),
            new SubmitCommandRequest({
                applicationId: "app-1",
                actAs: ["Alice"],
                command: new ExerciseByKeyCommand({
                    templateId,
                    contractKey: { owner: "Alice" },
                    choice: "Archive",
                    choiceArgument: {},
                }),
            }),
            new SubmitCommandRequest({
                applicationId: "app-1",
                actAs: ["Alice"],
                command: new CreateAndExerciseCommand({
                    templateId,
                    createArguments: new DamlRecord({}),
                    choice: "CreateAndArchive",
                    choiceArgument: {},
                }),
            }),
        ];

        expect(requests).toHaveLength(4);
    });
});
