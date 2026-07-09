import { describe, expect, it } from "vitest";
import {
    ExerciseCommand,
    SubmitCommandRequest,
} from "../../../src";
import { buildCanonicalCommandPayload } from "../../../src/services/commands/command-payload-builder.js";

describe("command payload builder", () => {
    it("encodes command kind and command-specific exercise fields", () => {
        const payload = buildCanonicalCommandPayload(
            new SubmitCommandRequest({
                applicationId: "app-1",
                actAs: ["Alice"],
                readAs: ["Bob"],
                command: new ExerciseCommand({
                    templateId: "Main:Vault",
                    contractId: "00abc",
                    choice: "Deposit",
                    argument: { amount: "10.0" },
                }),
            }),
        );

        const decoded = new TextDecoder().decode(payload);

        expect(decoded).toContain("\"kind\":\"exercise\"");
        expect(decoded).toContain("\"contractId\":\"00abc\"");
        expect(decoded).toContain("\"choice\":\"Deposit\"");
    });
});
