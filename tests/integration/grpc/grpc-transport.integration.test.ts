import { describe, expect, it } from "vitest";
import {
    CreateCommand,
    GetActiveContractsPageRequest,
    GetActiveContractsRequest,
    NotSupportedError,
    SubmitCommandRequest,
} from "../../../src";
import { createFakeGrpcOperations } from "../../fixtures/fake-grpc-services.js";

describe("grpc transport entrypoint", () => {
    it("exports protocol-specific entrypoints", async () => {
        const grpcModule = await import("../../../src/grpc/index.js");

        const client = new grpcModule.GrpcLedgerClient(
            createFakeGrpcOperations({
                queryContractsAsync: async () => ({
                    activeContracts: [
                        {
                            contractEntry: {
                                oneofKind: "activeContract",
                                activeContract: { contractId: "c2" },
                            },
                        },
                    ],
                }),
            }),
        );

        expect(grpcModule).toHaveProperty("GrpcLedgerClient");
        await expect(
            client.stateService.getActiveContractsPageAsync(
                new GetActiveContractsPageRequest({
                    party: "Alice",
                    templateId: "Main:Iou",
                }),
            ),
        ).resolves.toBeDefined();
        await expect(
            client.stateService.getActiveContractsAsync(
                new GetActiveContractsRequest({
                    party: "Alice",
                    templateId: "Main:Iou",
                }),
                { nextAsync: async () => undefined },
            ),
        ).rejects.toThrow(NotSupportedError);
        await expect(
            client.commandService.submitAndWaitAsync(
                new SubmitCommandRequest({
                    applicationId: "app-1",
                    actAs: ["Alice"],
                    command: new CreateCommand({
                        templateId: "Main:Iou",
                        payload: { issuer: "Alice" },
                    }),
                }),
            ),
        ).resolves.toBeDefined();
    });
});
