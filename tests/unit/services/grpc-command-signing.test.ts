import { describe, expect, it, vi } from "vitest";
import {
    CreateCommand,
    SignCommandResult,
    SubmitCommandRequest,
} from "../../../src";
import { CommandsClient } from "../../../src/services/commands/commands-client.js";

describe("CommandsClient grpc signing", () => {
    it("submits signed grpc commands through the command pipeline", async () => {
        const submitCommandAsync = vi.fn(async () => ({
            commandId: "cmd-1",
            transactionId: "tx-1",
        }));

        const client = new CommandsClient(
            {
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
                submitCommandAsync,
            },
            {
                signAsync: async () =>
                    new SignCommandResult({
                        algorithm: "ed25519",
                        signature: new Uint8Array([1, 2, 3]),
                    }),
            },
        );

        const result = await client.submitAsync(
            new SubmitCommandRequest({
                applicationId: "app-1",
                actAs: ["Alice"],
                command: new CreateCommand({
                    templateId: "Main:Iou",
                    payload: { issuer: "Alice" },
                }),
            }),
        );

        expect(result.commandId).toBe("cmd-1");
        expect(submitCommandAsync).toHaveBeenCalledOnce();
    });
});
