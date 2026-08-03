import { describe, expect, it } from "vitest";
import {
    CreateCommand,
    DamlRecord,
    type NonEmptyLedgerCommands,
    SubmitCommandsRequest,
} from "../../../src";

describe("SubmitCommandsRequest public surface", () => {
    it("exports the plural request and non-empty command batch type", () => {
        const commands: NonEmptyLedgerCommands = [
            new CreateCommand({
                templateId: { packageId: "", moduleName: "Main", entityName: "Iou" },
                createArguments: new DamlRecord({}),
            }),
        ];

        const request = new SubmitCommandsRequest({
            applicationId: "app-1",
            actAs: ["Alice"],
            commands,
        });

        expect(request.commands).toEqual(commands);
    });
});
