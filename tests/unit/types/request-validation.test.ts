import { describe, expect, it } from "vitest";
import {
    CreateCommand,
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
                        templateId: "Main:Iou",
                        payload: {},
                    }),
                }),
        ).toThrow(ValidationError);
    });

    it("accepts exercise commands when an acting party is present", () => {
        expect(
            () =>
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
        ).not.toThrow();
    });
});
