import { describe, expect, it, vi } from "vitest";
import { SignCommandResult, SubmitCommandRequest } from "../../../src";
import { CommandSubmissionPipeline } from "../../../src/services/commands/command-submission-pipeline.js";

describe("CommandSubmissionPipeline", () => {
    it("passes canonical command payloads to the signer before grpc submission", async () => {
        const signAsync = vi.fn(
            async () =>
                new SignCommandResult({
                    algorithm: "ed25519",
                    signature: new Uint8Array([1, 2, 3]),
                }),
        );

        const pipeline = new CommandSubmissionPipeline({
            transport: {
                features: { supportsCommandSigning: true },
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
                    transactionId: "tx-1",
                }),
            },
            signer: { signAsync },
        });

        await pipeline.submitAsync(
            new SubmitCommandRequest({
                applicationId: "app-1",
                actAs: ["Alice"],
            }),
        );

        expect(signAsync).toHaveBeenCalledOnce();
        expect(signAsync.mock.calls[0]?.[0].payload).toBeInstanceOf(Uint8Array);
    });
});
