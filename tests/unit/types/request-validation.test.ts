import { describe, expect, it } from "vitest";
import { CreateCommand, SubmitCommandRequest, ValidationError } from "../../../src";

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
});
