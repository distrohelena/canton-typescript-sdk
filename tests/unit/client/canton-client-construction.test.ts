import { describe, expect, it } from "vitest";
import { CantonClient, CantonClientOptions, TransportKind } from "../../../src";

describe("CantonClient", () => {
    it("creates grpc-shaped service objects", () => {
        const client = new CantonClient(
            new CantonClientOptions({
                transportKind: TransportKind.json,
                endpoint: "https://participant.example.com",
            }),
        );

        expect(client.versionService).toBeDefined();
        expect(client.partyManagementService).toBeDefined();
        expect(client.userManagementService).toBeDefined();
        expect(client.packageManagementService).toBeDefined();
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
        expect(client).not.toHaveProperty("commands");
        expect(client).not.toHaveProperty("contracts");
        expect(client).not.toHaveProperty("events");
    });
});
