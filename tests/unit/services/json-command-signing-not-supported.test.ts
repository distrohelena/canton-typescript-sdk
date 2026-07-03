import { describe, expect, it } from "vitest";
import {
    CreateCommand,
    NotSupportedError,
    SignCommandResult,
    SubmitCommandRequest,
} from "../../../src";
import { CommandSubmissionPipeline } from "../../../src/services/commands/command-submission-pipeline.js";

describe("JSON command signing", () => {
    it("rejects signing on transports that do not support it", async () => {
        const pipeline = new CommandSubmissionPipeline({
            transport: {
                features: { supportsCommandSigning: false },
                getHealthAsync: async () => {
                    throw new Error("not used");
                },
                createPartyAsync: async () => {
                    throw new Error("not used");
                },
                grantUserRightsAsync: async () => {
                    throw new Error("not used");
                },
                uploadPackageAsync: async () => {
                    throw new Error("not used");
                },
                queryContractsAsync: async () => {
                    throw new Error("not used");
                },
                streamTransactionsAsync: async () => {
                    throw new Error("not used");
                },
                submitCommandAsync: async () => ({
                    commandId: "cmd-1",
                }),
            },
            signer: {
                signAsync: async () =>
                    new SignCommandResult({
                        algorithm: "ed25519",
                        signature: new Uint8Array([1, 2, 3]),
                    }),
            },
        });

        await expect(
            pipeline.submitAsync(
                new SubmitCommandRequest({
                    applicationId: "app-1",
                    actAs: ["Alice"],
                    command: new CreateCommand({
                        templateId: "Main:Iou",
                        payload: { issuer: "Alice" },
                    }),
                }),
            ),
        ).rejects.toThrow(NotSupportedError);
    });
});
