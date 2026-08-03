import { describe, expect, it, vi } from "vitest";
import {
    CreateCommand,
    DamlRecord,
    ExerciseCommand,
    NotSupportedError,
    SubmitCommandsRequest,
    ValidationError,
} from "../../../src";
import { CommandServiceClient } from "../../../src/services/command/command-service-client.js";
import { CommandSubmissionServiceClient } from "../../../src/services/command-submission/command-submission-service-client.js";
import { GrpcTransport } from "../../../src/transports/grpc/grpc-transport.js";

describe("CommandServiceClient grpc signing", () => {
    it("prepares, signs, and executes signed grpc commands", async () => {
        const prepareSubmissionAsync = vi.fn(async () => ({
            preparedTransaction: {},
            preparedTransactionHash: new Uint8Array([9, 9, 9]),
            hashingSchemeVersion: 3,
        }));

        const executeSubmissionAndWaitAsync = vi.fn(async () => ({
            updateId: "tx-1",
            completionOffset: "10",
        }));

        const submitCommandAsync = vi.fn(async () => ({
            commandId: "cmd-1",
            transactionId: "tx-1",
        }));

        const client = new CommandServiceClient(
            new GrpcTransport({
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
                prepareSubmissionAsync,
                executeSubmissionAndWaitAsync,
                submitCommandAsync,
            }),
            {
                signAsync: async request => ({
                    algorithm: "ed25519",
                    signature: new Uint8Array([1, 2, 3]),
                    signedBy: "fingerprint::1",
                    keyId: request.keyId,
                }),
            },
        );

        const result = await client.submitAndWaitAsync(
            new SubmitCommandsRequest({
                applicationId: "app-1",
                actAs: ["Alice"],
                commands: [new CreateCommand({
                    templateId: { packageId: "", moduleName: "Main", entityName: "Iou" },
                    createArguments: new DamlRecord({ issuer: "Alice" }),
                })],
            }),
        );

        expect(result.transactionId).toBe("tx-1");
        expect(prepareSubmissionAsync).toHaveBeenCalledOnce();
        expect(executeSubmissionAndWaitAsync).toHaveBeenCalledOnce();
        expect(submitCommandAsync).not.toHaveBeenCalled();
    });

    it("submits a participant-local command without using its configured external signer", async () => {
        const signAsync = vi.fn(async () => {
            throw new Error("external signer must not be called");
        });

        const submitCommandAsync = vi.fn(async () => ({
            commandId: "cmd-local",
            transactionId: "tx-local",
        }));

        const prepareSubmissionAsync = vi.fn(async () => {
            throw new Error("interactive prepare must not be called");
        });

        const executeSubmissionAndWaitAsync = vi.fn(async () => {
            throw new Error("interactive execute must not be called");
        });

        const client = new CommandServiceClient(
            new GrpcTransport({
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
                prepareSubmissionAsync,
                executeSubmissionAndWaitAsync,
            }),
            { signAsync },
        );

        const request = new SubmitCommandsRequest({
            applicationId: "app-local",
            actAs: ["Alice"],
            commands: [new CreateCommand({
                templateId: { packageId: "", moduleName: "Main", entityName: "Iou" },
                createArguments: new DamlRecord({ issuer: "Alice" }),
            })],
        });

        await expect(
            client.submitParticipantLocalAndWaitAsync(request),
        ).resolves.toMatchObject({ transactionId: "tx-local" });
        expect(submitCommandAsync).toHaveBeenCalledOnce();
        expect(signAsync).not.toHaveBeenCalled();
        expect(prepareSubmissionAsync).not.toHaveBeenCalled();
        expect(executeSubmissionAndWaitAsync).not.toHaveBeenCalled();
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
                new SubmitCommandsRequest({
                    applicationId: "app-1",
                    actAs: ["Alice"],
                    commands: [new CreateCommand({
                        templateId: { packageId: "", moduleName: "Main", entityName: "Iou" },
                        createArguments: new DamlRecord({ issuer: "Alice" }),
                    })],
                }),
            ),
        ).rejects.toThrow(NotSupportedError);
    });

    it("allows multi-party grpc command signing to reach preparation", async () => {
        const client = new CommandServiceClient(
            new GrpcTransport({
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
                prepareSubmissionAsync: async () => {
                    throw new Error("not used");
                },
                executeSubmissionAndWaitAsync: async () => {
                    throw new Error("not used");
                },
                submitCommandAsync: async () => {
                    throw new Error("not used");
                },
            }),
            {
                signAsync: async () => ({
                    algorithm: "ed25519",
                    signature: new Uint8Array([1, 2, 3]),
                    signedBy: "fingerprint::1",
                }),
            },
        );

        await expect(
            client.submitAndWaitAsync(
                new SubmitCommandsRequest({
                    applicationId: "app-1",
                    actAs: ["Alice", "Bob"],
                    commands: [new ExerciseCommand({
                        templateId: { packageId: "", moduleName: "Main", entityName: "Iou" },
                        contractId: "00abc",
                        choice: "Archive",
                        choiceArgument: {},
                    })],
                }),
            ),
        ).rejects.toThrow("not used");
    });
});
