import { describe, expect, it } from "vitest";
import {
    CreateCommand,
    DamlRecord,
    SignCommandRequest,
    SignCommandResult,
    SubmitCommandsRequest,
    ValidationError,
} from "../../../src";

describe("interactive command signing contracts", () => {
    it("stores submit request userId", () => {
        const request = new SubmitCommandsRequest({
            applicationId: "app-1",
            userId: "wallet-user",
            actAs: ["Alice"],
            commands: [new CreateCommand({
                templateId: { packageId: "", moduleName: "Main", entityName: "Iou" },
                createArguments: new DamlRecord({}),
            })],
        });

        expect(request.userId).toBe("wallet-user");
    });

    it("stores signer request party context", () => {
        const request = new SignCommandRequest({
            payload: new Uint8Array([1, 2, 3]),
            party: "Alice",
            algorithmHint: "ed25519",
            keyId: "kid-1",
        });

        expect(request.party).toBe("Alice");
        expect(request.algorithmHint).toBe("ed25519");
        expect(request.keyId).toBe("kid-1");
    });

    it("requires signedBy on signer results", () => {
        expect(
            () =>
                new SignCommandResult({
                    algorithm: "ed25519",
                    signature: new Uint8Array([1, 2, 3]),
                    signedBy: "",
                }),
        ).toThrow(ValidationError);
    });
});
