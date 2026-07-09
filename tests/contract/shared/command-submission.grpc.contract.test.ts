import { describe, expect, it, vi } from "vitest";
import {
    CreateCommand,
    ExerciseCommand,
    SignCommandResult,
    SubmitCommandRequest,
} from "../../../src";
import { CommandServiceClient } from "../../../src/services/command/command-service-client.js";
import { GrpcTransport } from "../../../src/transports/grpc/grpc-transport.js";

describe("grpc command submission contract", () => {
    it("supports signed command submission", async () => {
        const signAsync = vi.fn(
            async () =>
                new SignCommandResult({
                    algorithm: "ed25519",
                    signature: new Uint8Array([1, 2, 3]),
                    signedBy: "fingerprint::1",
                }),
        );

        const commandService = new CommandServiceClient(
            new GrpcTransport({
                getHealthAsync: async () => ({ status: "healthy" }),
                createPartyAsync: async () => ({ identifier: "unused" }),
                listPartiesAsync: async () => ({
                    partyDetails: [],
                    nextPageToken: "",
                }),
                grantUserRightsAsync: async () => ({ rights: [] }),
                uploadPackageAsync: async () => ({ packageId: "unused" }),
                queryContractsAsync: async () => ({ contracts: [] }),
                streamTransactionsAsync: async () => [],
                prepareSubmissionAsync: async () => ({
                    preparedTransaction: {},
                    preparedTransactionHash: new Uint8Array([9, 9, 9]),
                    hashingSchemeVersion: 3,
                }),
                executeSubmissionAndWaitAsync: async () => ({
                    updateId: "tx-1",
                    completionOffset: "10",
                }),
                submitCommandAsync: async () => {
                    throw new Error("plain submit should not be used");
                },
            }),
            { signAsync },
        );

        await expect(
            commandService.submitAndWaitAsync(
                new SubmitCommandRequest({
                    applicationId: "app-1",
                    actAs: ["Alice"],
                    command: new CreateCommand({
                        templateId: "Main:Iou",
                        payload: { issuer: "Alice" },
                    }),
                }),
            ),
        ).resolves.toMatchObject({
            transactionId: "tx-1",
        });

        expect(signAsync).toHaveBeenCalledOnce();
    });

    it("supports signed exercise command submission", async () => {
        const signAsync = vi.fn(
            async () =>
                new SignCommandResult({
                    algorithm: "ed25519",
                    signature: new Uint8Array([1, 2, 3]),
                    signedBy: "fingerprint::1",
                }),
        );

        const commandService = new CommandServiceClient(
            new GrpcTransport({
                getHealthAsync: async () => ({ status: "healthy" }),
                createPartyAsync: async () => ({ identifier: "unused" }),
                listPartiesAsync: async () => ({
                    partyDetails: [],
                    nextPageToken: "",
                }),
                grantUserRightsAsync: async () => ({ rights: [] }),
                uploadPackageAsync: async () => ({ packageId: "unused" }),
                queryContractsAsync: async () => ({ contracts: [] }),
                streamTransactionsAsync: async () => [],
                prepareSubmissionAsync: async () => ({
                    preparedTransaction: {},
                    preparedTransactionHash: new Uint8Array([9, 9, 9]),
                    hashingSchemeVersion: 3,
                }),
                executeSubmissionAndWaitAsync: async () => ({
                    updateId: "tx-2",
                    completionOffset: "11",
                }),
                submitCommandAsync: async () => {
                    throw new Error("plain submit should not be used");
                },
            }),
            { signAsync },
        );

        await expect(
            commandService.submitAndWaitAsync(
                new SubmitCommandRequest({
                    applicationId: "app-1",
                    actAs: ["Alice"],
                    command: new CreateCommand({
                        templateId: "Main:Iou",
                        payload: { issuer: "Alice" },
                    }),
                }),
            ),
        ).resolves.toMatchObject({
            transactionId: "tx-2",
        });

        expect(signAsync).toHaveBeenCalledOnce();
    });
});
