import { describe, expect, it, vi } from "vitest";
import {
    CreateCommand,
    DamlRecord,
    RequestOptions,
    SubmitCommandsRequest,
} from "../../../src";
import { ITransport } from "../../../src/core/transports/transport.interface.js";
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

        const request = new SubmitCommandsRequest({
            applicationId: "app-1",
            actAs: ["Alice"],
            commands: [new CreateCommand({
                templateId: { packageId: "", moduleName: "Main", entityName: "Iou" },
                createArguments: new DamlRecord({
                    issuer: "Alice",
                    owner: "Bob",
                }),
            })],
        });

        expect(request.commands[0].templateId).toEqual({ packageId: "", moduleName: "Main", entityName: "Iou" });
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

        const request = new SubmitCommandsRequest({
            applicationId: "app-1",
            actAs: ["Alice"],
            readAs: ["Bob"],
            commands: [new CreateCommand({
                templateId: { packageId: "", moduleName: "Main", entityName: "Iou" },
                createArguments: new DamlRecord({
                    issuer: "Alice",
                    owner: "Bob",
                }),
            })],
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

    it("bypasses a configured signer for participant-local submissions", async () => {
        const signAsync = vi.fn(async () => {
            throw new Error("participant-local submission must not sign");
        });

        const submitCommandAsync = vi.fn(async () => ({
            commandId: "cmd-local",
            transactionId: "tx-local",
        }));

        const transport = {
            features: { supportsCommandSigning: true },
            submitCommandAsync,
        } as unknown as ITransport;

        const pipeline = new CommandSubmissionPipeline({
            transport,
            signer: { signAsync },
        });

        const request = new SubmitCommandsRequest({
            applicationId: "app-local",
            actAs: ["Alice"],
            commands: [
                new CreateCommand({
                    templateId: { packageId: "", moduleName: "Main", entityName: "Iou" },
                    createArguments: new DamlRecord({ marker: "first" }),
                }),
                new CreateCommand({
                    templateId: { packageId: "", moduleName: "Main", entityName: "Iou" },
                    createArguments: new DamlRecord({ marker: "second" }),
                }),
            ],
        });

        const options = new RequestOptions({ timeoutMs: 5_000 });

        const result = await pipeline.submitParticipantLocalAsync(request, options);

        expect(result).toMatchObject({ transactionId: "tx-local" });
        expect(signAsync).not.toHaveBeenCalled();
        expect(submitCommandAsync).toHaveBeenCalledWith(request, undefined, options);
        expect(request.commands.map(command =>
            (command as CreateCommand).createArguments.fields.marker,
        )).toEqual(["first", "second"]);
    });
});
