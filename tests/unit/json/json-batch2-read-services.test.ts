import { describe, expect, it } from "vitest";
import {
    CantonClient,
    CantonClientOptions,
    CommandState,
    GetCommandStatusRequest,
    GetIdentityProviderConfigRequest,
    ListIdentityProviderConfigsRequest,
    NotSupportedError,
    TransportKind,
} from "../../../src";
import { GetResourceLimitsRequest } from "../../../src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/resource_management_service.js";
import {
    CurrentTimeRequest,
    GetIdRequest,
} from "../../../src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/initialization_service.js";

describe("Batch 2 read services with JSON transport", () => {
    it("rejects unsupported ledger-admin and participant-admin read methods", async () => {
        const client = new CantonClient(
            new CantonClientOptions({
                transportKind: TransportKind.json,
                ledgerAdminEndpoint: "https://ledger-admin.example.com",
                participantAdminEndpoint:
                    "https://participant-admin.example.com",
            }),
        );

        const calls = [
            [
                "CommandInspectionService.GetCommandStatus",
                () =>
                    client.commandInspectionService.getCommandStatusAsync(
                        new GetCommandStatusRequest({
                            commandIdPrefix: "cmd-",
                            state: CommandState.pending,
                            limit: 10,
                        }),
                    ),
            ],
            [
                "IdentityProviderConfigService.GetIdentityProviderConfig",
                () =>
                    client.identityProviderConfigService.getIdentityProviderConfigAsync(
                        new GetIdentityProviderConfigRequest({
                            identityProviderId: "idp-1",
                        }),
                    ),
            ],
            [
                "IdentityProviderConfigService.ListIdentityProviderConfigs",
                () =>
                    client.identityProviderConfigService.listIdentityProviderConfigsAsync(
                        new ListIdentityProviderConfigsRequest(),
                    ),
            ],
            [
                "ResourceManagementService.GetResourceLimits",
                () =>
                    client.resourceManagementService.getResourceLimitsAsync(
                        GetResourceLimitsRequest.create(),
                    ),
            ],
            [
                "IdentityInitializationService.GetId",
                () =>
                    client.identityInitializationService.getIdAsync(
                        GetIdRequest.create(),
                    ),
            ],
            [
                "IdentityInitializationService.CurrentTime",
                () =>
                    client.identityInitializationService.currentTimeAsync(
                        CurrentTimeRequest.create(),
                    ),
            ],
        ] as const;

        for (const [message, invoke] of calls) {
            await expect(invoke()).rejects.toThrow(NotSupportedError);
            await expect(invoke()).rejects.toThrow(message);
        }
    });
});
