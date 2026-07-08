import { describe, expect, it, vi } from "vitest";
import {
    CreateCommand,
    GetActiveContractsPageRequest,
    GetActiveContractsRequest,
    HealthCheckRequest,
    NotSupportedError,
    SubmitCommandRequest,
} from "../../../src";

describe("json transport entrypoint", () => {
    it("exports protocol-specific entrypoints", async () => {
        const jsonModule = await import("../../../src/json/index.js");

        const capturedBodies: Record<string, unknown> = {};

        const client = new jsonModule.JsonLedgerClient(
            {
                getAsync: async () => ({}),
                postAsync: async (path: string, body: unknown) => {
                    capturedBodies[path] = body;

                    if (path === "/v1/query") {
                        return { result: [{ contractId: "c1" }] };
                    }

                    else if (path === "/v1/stream/query") {
                        return { events: [{ contractId: "c2" }] };
                    }

                    else if (path === "/v1/create") {
                        return {
                            result: { commandId: "cmd-1", transactionId: "tx-1" },
                        };
                    }

                    return {};
                },
            },
        );

        expect(jsonModule).toHaveProperty("JsonLedgerClient");
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

        const nextAsync = vi.fn(async () => undefined);

        await expect(
            client.healthService.checkAsync(
                new HealthCheckRequest({
                    service: "grpc.health.v1.Health",
                }),
            ),
        ).rejects.toThrow(NotSupportedError);
        await expect(
            client.stateService.getActiveContractsPageAsync(
                new GetActiveContractsPageRequest({
                    party: "Alice",
                    templateId: "Main:Iou",
                }),
            ),
        ).resolves.toBeDefined();
        await client.stateService.getActiveContractsAsync(
            new GetActiveContractsRequest({
                party: "Alice",
                templateId: "Main:Iou",
            }),
            { nextAsync },
        );
        await expect(
            client.commandService.submitAndWaitAsync(
                new SubmitCommandRequest({
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
                }),
            ),
        ).resolves.toBeDefined();
        expect(capturedBodies["/v1/create"]).toEqual({
            templateId: "Main:Iou",
            payload: {
                issuer: "Alice",
                owner: "Bob",
            },
            applicationId: "app-1",
            actAs: ["Alice"],
            readAs: ["Bob"],
        });
        expect(capturedBodies["/v1/stream/query"]).toEqual({
            party: "Alice",
            templateIds: ["Main:Iou"],
        });
        expect(nextAsync).toHaveBeenCalledWith({ contractId: "c2" });
    });

    it("rejects interface-filter active contract page reads on json", async () => {
        const jsonModule = await import("../../../src/json/index.js");

        const client = new jsonModule.JsonLedgerClient(
            {
                getAsync: async () => ({}),
                postAsync: async () => {
                    throw new Error("not used");
                },
            },
        );

        await expect(
            client.stateService.getActiveContractsPageAsync(
                new GetActiveContractsPageRequest({
                    party: "Alice",
                    interfaceId: "Main:IAsset",
                    includeInterfaceView: true,
                }),
            ),
        ).rejects.toThrow(NotSupportedError);
    });
});
