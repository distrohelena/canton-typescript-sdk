import { describe, expect, it, vi } from "vitest";
import {
    CreateCommand,
    RequestOptions,
    SubmitCommandRequest,
} from "../../../src";
import { CommandSubmissionPipeline } from "../../../src/services/commands/command-submission-pipeline.js";

describe("CommandSubmissionPipeline", () => {
    it("passes the signer through to the transport for grpc submissions", async () => {
        const signAsync = vi.fn(async () => {
            throw new Error("transport should own signing orchestration");
        });

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

        expect(signAsync).not.toHaveBeenCalled();
        expect(submitCommandAsync).toHaveBeenNthCalledWith(
            1,
            request,
            expect.objectContaining({
                signAsync,
            }),
            undefined,
        );

        const options = new RequestOptions({
            timeoutMs: 5_000,
        });

        await pipeline.submitAsync(request, options);

        expect(submitCommandAsync).toHaveBeenLastCalledWith(
            request,
            expect.objectContaining({
                signAsync,
            }),
            options,
        );
    });

    it("does not pre-sign command payloads inside the pipeline", async () => {
        const signAsync = vi.fn(async () => {
            throw new Error("transport should own signing orchestration");
        });

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
            readAs: ["Bob"],
            command: new CreateCommand({
                templateId: "Main:Iou",
                payload: {
                    issuer: "Alice",
                    owner: "Bob",
                },
            }),
        });

        await pipeline.submitAsync(request);

        expect(signAsync).not.toHaveBeenCalled();
        expect(submitCommandAsync).toHaveBeenCalledWith(
            request,
            expect.objectContaining({
                signAsync,
            }),
            undefined,
        );
    });
});
