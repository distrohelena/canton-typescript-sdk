import { describe, expect, it } from "vitest";
import {
    CreateCommand,
    DamlRecord,
    ExerciseCommand,
    SubmitCommandRequest,
    ValidationError,
} from "../../../src";

describe("request validation", () => {
    it("rejects a submit request without an acting party", () => {
        expect(
            () =>
                new SubmitCommandRequest({
                    applicationId: "app-1",
                    actAs: [],
                    command: new CreateCommand({
                        templateId: { packageId: "", moduleName: "Main", entityName: "Iou" },
                        createArguments: new DamlRecord({}),
                    }),
                }),
        ).toThrow(ValidationError);
    });

    it("accepts exercise commands when an acting party is present", () => {
        expect(
            () =>
                new SubmitCommandRequest({
                    applicationId: "app-1",
                    userId: "wallet-user",
                    actAs: ["Alice"],
                    command: new ExerciseCommand({
                        templateId: { packageId: "", moduleName: "Main", entityName: "Iou" },
                        contractId: "00abc",
                        choice: "Archive",
                        choiceArgument: {},
                    }),
                }),
        ).not.toThrow();
    });

    it("stores a submit request userId when provided", () => {
        const request = new SubmitCommandRequest({
            applicationId: "app-1",
            userId: "wallet-user",
            actAs: ["Alice"],
            command: new CreateCommand({
                templateId: { packageId: "", moduleName: "Main", entityName: "Iou" },
                createArguments: new DamlRecord({}),
            }),
        });

        expect(request.userId).toBe("wallet-user");
    });
});
