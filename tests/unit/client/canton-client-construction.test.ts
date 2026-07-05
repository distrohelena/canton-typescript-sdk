import { describe, expect, it, vi } from "vitest";
import { CantonClient, CantonClientOptions, TransportKind } from "../../../src";
import { createServiceRegistry } from "../../../src/client/service-registry.js";

vi.mock("../../../src/client/service-registry.js", async () => {
    const actual = await vi.importActual<
        typeof import("../../../src/client/service-registry.js")
    >("../../../src/client/service-registry.js");

    return {
        ...actual,
        createServiceRegistry: vi.fn(actual.createServiceRegistry),
    };
});

describe("CantonClient", () => {
    it("creates grpc-shaped service objects", () => {
        const client = new CantonClient(
            new CantonClientOptions({
                transportKind: TransportKind.json,
                ledgerEndpoint: "https://ledger.example.com",
                adminEndpoint: "https://admin.example.com",
            }),
        );

        expect(client.versionService).toBeDefined();
        expect(client.healthService).toBeDefined();
        expect(client.partyManagementService).toBeDefined();
        expect(client.userManagementService).toBeDefined();
        expect(client.packageService).toBeDefined();
        expect(client.participantPackageService).toBeDefined();
        expect(client.commandService).toBeDefined();
        expect(client.commandSubmissionService).toBeDefined();
        expect(client.commandCompletionService).toBeDefined();
        expect(client.stateService).toBeDefined();
        expect(client.updateService).toBeDefined();
        expect(client.eventQueryService).toBeDefined();
        expect(client.contractService).toBeDefined();
        expect(client).not.toHaveProperty("system");
        expect(client).not.toHaveProperty("parties");
        expect(client).not.toHaveProperty("users");
        expect(client).not.toHaveProperty("packages");
        expect(client).not.toHaveProperty("packageManagementService");
        expect(client).not.toHaveProperty("commands");
        expect(client).not.toHaveProperty("contracts");
        expect(client).not.toHaveProperty("events");
    });

    it("disposes the shared transport once", async () => {
        const disposeAsync = vi.fn(async () => undefined);

        const serviceRegistry = {
            transport: {
                disposeAsync,
            },
            versionService: {},
            healthService: {},
            partyManagementService: {},
            userManagementService: {},
            packageService: {},
            participantPackageService: {},
            commandService: {},
            commandSubmissionService: {},
            commandCompletionService: {},
            stateService: {},
            updateService: {},
            eventQueryService: {},
            contractService: {},
        };

        vi.mocked(createServiceRegistry).mockReturnValueOnce(
            serviceRegistry as ReturnType<typeof createServiceRegistry>,
        );

        const client = new CantonClient(
            new CantonClientOptions({
                transportKind: TransportKind.json,
                ledgerEndpoint: "https://ledger.example.com",
            }),
        );

        await client.disposeAsync();
        await client.disposeAsync();

        expect(createServiceRegistry).toHaveReturnedWith(serviceRegistry);
        expect(disposeAsync).toHaveBeenCalledTimes(1);
    });
});
