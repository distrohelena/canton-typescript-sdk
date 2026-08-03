import { describe, expect, it } from "vitest";
import {
    CreateCommand,
    DamlRecord,
    ExerciseCommand,
    SubmitCommandsRequest,
} from "../../../src";
import { buildCanonicalCommandPayload } from "../../../src/services/commands/command-payload-builder.js";

describe("command payload builder", () => {
    it("encodes ordered command batches without a singular command key", () => {
        const payload = buildCanonicalCommandPayload(
            new SubmitCommandsRequest({
                applicationId: "app-1",
                actAs: ["Alice"],
                readAs: ["Bob"],
                commands: [
                    new CreateCommand({
                        templateId: { packageId: "", moduleName: "Main", entityName: "Iou" },
                        createArguments: new DamlRecord({ issuer: "Alice" }),
                    }),
                    new ExerciseCommand({
                        templateId: { packageId: "", moduleName: "Main", entityName: "Vault" },
                        contractId: "00abc",
                        choice: "Deposit",
                        choiceArgument: { amount: "10.0" },
                    }),
                ],
            }),
        );

        const decoded = JSON.parse(new TextDecoder().decode(payload));

        expect(decoded).toMatchObject({
            commands: [
                { kind: "create" },
                { kind: "exercise", contractId: "00abc", choice: "Deposit" },
            ],
        });
        expect(decoded).not.toHaveProperty("command");
    });

    it("encodes create argument fields and record IDs", () => {
        const payload = buildCanonicalCommandPayload(
            new SubmitCommandsRequest({
                applicationId: "app-1",
                actAs: ["Alice"],
                commands: [new CreateCommand({
                    templateId: { packageId: "", moduleName: "Main", entityName: "Iou" },
                    createArguments: new DamlRecord(
                        { issuer: "Alice" },
                        { packageId: "pkg-id", moduleName: "Main", entityName: "IouArguments" },
                    ),
                })],
            }),
        );

        expect(JSON.parse(new TextDecoder().decode(payload))).toMatchObject({
            commands: [{
                createArguments: {
                    fields: { issuer: "Alice" },
                    recordId: {
                        packageId: "pkg-id",
                        moduleName: "Main",
                        entityName: "IouArguments",
                    },
                },
            }],
        });
    });
});
