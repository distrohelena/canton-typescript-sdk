import { describe, expect, it } from "vitest";
import {
    ExerciseCommand,
    GetActiveContractsPageRequest,
    GetActiveContractsRequest,
    HealthCheckRequest,
    HealthCheckStatus,
    NotSupportedError,
    SubmitCommandRequest,
} from "../../../src";
import { createFakeGrpcOperations } from "../../fixtures/fake-grpc-services.js";

describe("grpc transport entrypoint", () => {
    it("exports protocol-specific entrypoints", async () => {
        const grpcModule = await import("../../../src/grpc/index.js");

        const client = new grpcModule.GrpcLedgerClient(
            createFakeGrpcOperations({
                checkHealthAsync: async () => ({ status: 1 }),
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
        expect(client.versionService).toBeDefined();
        expect(client.healthService).toBeDefined();
        expect(client.partyManagementService).toBeDefined();
        expect(client.userManagementService).toBeDefined();
        expect(client.packageService).toBeDefined();
        expect(client.packageManagementService).toBeDefined();
        expect(client.participantPackageService).toBeDefined();
        expect(client.participantStatusService).toBeDefined();
        expect(client.commandService).toBeDefined();
        expect(client.commandSubmissionService).toBeDefined();
        expect(client.commandCompletionService).toBeDefined();
        expect(client.stateService).toBeDefined();
        expect(client.updateService).toBeDefined();
        expect(client.eventQueryService).toBeDefined();
        expect(client.contractService).toBeDefined();
        expect(client).not.toHaveProperty("commands");
        expect(client).not.toHaveProperty("contracts");
        expect(client).not.toHaveProperty("events");
        await expect(
            client.healthService.checkAsync(
                new HealthCheckRequest({
                    service: "grpc.health.v1.Health",
                }),
            ),
        ).resolves.toMatchObject({
            status: HealthCheckStatus.serving,
        });
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
                    command: new ExerciseCommand({
                        templateId: "Main:Iou",
                        contractId: "00abc",
                        choice: "Archive",
                        argument: {},
                    }),
                }),
            ),
        ).resolves.toBeDefined();
    });
});
