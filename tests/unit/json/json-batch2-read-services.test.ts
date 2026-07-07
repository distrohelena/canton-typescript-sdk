import { describe, expect, it } from "vitest";
import {
    CantonClient,
    CantonClientOptions,
    CommandState,
    CurrentTimeRequest,
    GetCommandStatusRequest,
    GetIdRequest,
    GetIdentityProviderConfigRequest,
    GetResourceLimitsRequest,
    ListIdentityProviderConfigsRequest,
    NotSupportedError,
    TransportKind,
} from "../../../src";

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
                        new GetResourceLimitsRequest(),
                    ),
            ],
            [
                "IdentityInitializationService.GetId",
                () =>
                    client.identityInitializationService.getIdAsync(
                        new GetIdRequest(),
                    ),
            ],
            [
                "IdentityInitializationService.CurrentTime",
                () =>
                    client.identityInitializationService.currentTimeAsync(
                        new CurrentTimeRequest(),
                    ),
            ],
        ] as const;

        for (const [message, invoke] of calls) {
            await expect(invoke()).rejects.toThrow(NotSupportedError);
            await expect(invoke()).rejects.toThrow(message);
        }
    });
});
