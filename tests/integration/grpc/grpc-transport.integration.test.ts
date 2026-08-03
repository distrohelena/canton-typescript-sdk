import { describe, expect, it } from "vitest";
import {
    ExerciseCommand,
    GetActiveContractsRequest,
    NotSupportedError,
    SignCommandResult,
    SubmitCommandsRequest,
} from "../../../src";
import { GetActiveContractsPageRequest } from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/state_service.js";
import { HealthCheckRequest } from "../../../src/transports/grpc/generated/canton/google/grpc/health/v1/health.js";
import { createFakeGrpcOperations } from "../../fixtures/fake-grpc-services.js";

describe("grpc transport entrypoint", () => {
    it("exports protocol-specific entrypoints", async () => {
        const grpcModule = await import("../../../src/grpc/index.js");

        let capturedActiveContractsRequest: unknown;

        const client = new grpcModule.GrpcLedgerClient(
            createFakeGrpcOperations({
                checkHealthAsync: async () => ({ status: 1 }),
                queryContractsAsync: async request => {
                    capturedActiveContractsRequest = request;

                    return {
                        activeContracts: [
                            {
                                contractEntry: {
                                    oneofKind: "activeContract",
                                    activeContract: { contractId: "c2" },
                                },
                            },
                        ],
                    };
                },
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
                HealthCheckRequest.create({
                    service: "grpc.health.v1.Health",
                }),
            ),
        ).resolves.toMatchObject({
            status: 1,
        });

        const activeContractsRequest = GetActiveContractsPageRequest.create({
            eventFormat: {
                filtersByParty: {
                    Alice: { cumulative: [] },
                },
                verbose: true,
            },
        });

        await expect(
            client.stateService.getActiveContractsPageAsync(activeContractsRequest),
        ).resolves.toBeDefined();
        expect(capturedActiveContractsRequest).toBe(activeContractsRequest);
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
                new SubmitCommandsRequest({
                    applicationId: "app-1",
                    actAs: ["Alice"],
                    commands: [new ExerciseCommand({
                        templateId: { packageId: "", moduleName: "Main", entityName: "Iou" },
                        contractId: "00abc",
                        choice: "Archive",
                        choiceArgument: {},
                    })],
                }),
            ),
        ).resolves.toBeDefined();

        const signedClient = new grpcModule.GrpcLedgerClient(
            createFakeGrpcOperations(),
            {
                signAsync: async () =>
                    new SignCommandResult({
                        algorithm: "ed25519",
                        signature: new Uint8Array([1, 2, 3]),
                        signedBy: "fingerprint::1",
                    }),
            },
        );

        await expect(
            signedClient.commandService.submitAndWaitAsync(
                new SubmitCommandsRequest({
                    applicationId: "app-1",
                    actAs: ["Alice"],
                    commands: [new ExerciseCommand({
                        templateId: { packageId: "", moduleName: "Main", entityName: "Iou" },
                        contractId: "00abc",
                        choice: "Archive",
                        choiceArgument: {},
                    })],
                }),
            ),
        ).resolves.toBeDefined();
    });
});
