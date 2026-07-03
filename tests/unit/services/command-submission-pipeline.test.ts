import { describe, expect, it, vi } from "vitest";
import {
    CreateCommand,
    RequestOptions,
    SignCommandResult,
    SubmitCommandRequest,
} from "../../../src";
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

        const submitCommandAsync = vi.fn(async () => ({
            commandId: "cmd-1",
            transactionId: "tx-1",
        }));

        const pipeline = new CommandSubmissionPipeline({
            transport: {
                features: { supportsCommandSigning: true },
                getLedgerApiVersionAsync: async () => {
                    throw new Error("not used");
                },
                allocatePartyAsync: async () => {
                    throw new Error("not used");
                },
                listKnownPartiesAsync: async () => {
                    throw new Error("not used");
                },
                grantUserRightsAsync: async () => {
                    throw new Error("not used");
                },
                uploadDarFileAsync: async () => {
                    throw new Error("not used");
                },
                getActiveContractsPageAsync: async () => {
                    throw new Error("not used");
                },
                getActiveContractsAsync: async () => {
                    throw new Error("not used");
                },
                getUpdatesAsync: async () => {
                    throw new Error("not used");
                },
                submitCommandAsync,
            },
            signer: { signAsync },
        });

        const request = new SubmitCommandRequest({
            applicationId: "app-1",
            actAs: ["Alice"],
            command: new CreateCommand({
                templateId: "Main:Iou",
                payload: {
                    issuer: "Alice",
                    owner: "Bob",
                },
            }),
        });

        expect(request.command.templateId).toBe("Main:Iou");
        await pipeline.submitAsync(request);

        expect(signAsync).toHaveBeenCalledOnce();
        expect(signAsync.mock.calls[0]?.[0].payload).toBeInstanceOf(Uint8Array);
        expect(
            new TextDecoder().decode(signAsync.mock.calls[0]?.[0].payload),
        ).toContain("\"templateId\":\"Main:Iou\"");

        const options = new RequestOptions({
            timeoutMs: 5_000,
        });

        await pipeline.submitAsync(request, options);

        expect(submitCommandAsync).toHaveBeenLastCalledWith(
            request,
            expect.any(SignCommandResult),
            options,
        );
    });
});
