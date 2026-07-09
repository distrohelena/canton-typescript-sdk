import { describe, expect, it, vi } from "vitest";
import {
    CreateCommand,
    NotSupportedError,
    SubmitCommandRequest,
} from "../../../src";
import { CommandServiceClient } from "../../../src/services/command/command-service-client.js";
import { CommandSubmissionServiceClient } from "../../../src/services/command-submission/command-submission-service-client.js";

describe("CommandServiceClient grpc signing", () => {
    it("submits signed grpc commands through the command pipeline", async () => {
        const submitCommandAsync = vi.fn(async () => ({
            commandId: "cmd-1",
            transactionId: "tx-1",
        }));

        const client = new CommandServiceClient(
            {
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
            {
                signAsync: async () => {
                    throw new Error("transport should own signing orchestration");
                },
            },
        );

        const result = await client.submitAndWaitAsync(
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
        expect(submitCommandAsync).toHaveBeenCalledWith(
            expect.any(SubmitCommandRequest),
            expect.objectContaining({
                signAsync: expect.any(Function),
            }),
            undefined,
        );
    });

    it("keeps command submission service unsupported for now", async () => {
        const client = new CommandSubmissionServiceClient({
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
            submitCommandAsync: async () => {
                throw new Error("not used");
            },
        });

        await expect(
            client.submitAsync(
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
