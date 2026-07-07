import { describe, expect, it } from "vitest";
import {
    CommandInspectionServiceClient,
    CommandState,
    CurrentTimeRequest,
    GetCommandStatusRequest,
    GetIdRequest,
    GetIdentityProviderConfigRequest,
    GetResourceLimitsRequest,
    IdentityInitializationServiceClient,
    IdentityProviderConfigServiceClient,
    ListIdentityProviderConfigsRequest,
    RequestOptions,
    ResourceManagementServiceClient,
} from "../../../src";
import { GrpcTransport } from "../../../src/transports/grpc/grpc-transport.js";

describe("GrpcTransport batch 2 read services", () => {
    it("maps ledger-admin and participant-admin read methods", async () => {
        const transport = new GrpcTransport({
            getHealthAsync: async () => ({ version: "3.4.0", features: {} }),
            checkHealthAsync: async () => ({ status: 1 }),
            createPartyAsync: async () => ({ identifier: "unused" }),
            listPartiesAsync: async () => ({ partyDetails: [], nextPageToken: "" }),
            grantUserRightsAsync: async () => ({ rights: [] }),
            uploadPackageAsync: async () => ({ packageId: "unused" }),
            queryContractsAsync: async () => ({ activeContracts: [] }),
            streamTransactionsAsync: async () => [],
            submitCommandAsync: async () => ({ updateId: "unused" }),
            getCommandStatusAsync: async () => ({
                commandStatus: [
                    {
                        state: 2,
                        synchronizerId: "sync-1",
                        commands: [],
                        timings: [
                            {
                                description: "interpretation",
                                durationMs: 12,
                            },
                        ],
                    },
                ],
            }),
            getIdentityProviderConfigAsync: async () => ({
                identityProviderConfig: {
                    identityProviderId: "idp-1",
                    isDeactivated: false,
                    issuer: "https://issuer.example.com",
                    jwksUrl: "https://issuer.example.com/jwks.json",
                    audience: "ledger-api",
                },
            }),
            listIdentityProviderConfigsAsync: async () => ({
                identityProviderConfigs: [
                    {
                        identityProviderId: "idp-1",
                        isDeactivated: false,
                        issuer: "https://issuer.example.com",
                        jwksUrl: "https://issuer.example.com/jwks.json",
                        audience: "ledger-api",
                    },
                ],
            }),
            getResourceLimitsAsync: async () => ({
                currentLimits: {
                    maxInflightValidationRequests: 50,
                    maxSubmissionRate: 100,
                    maxSubmissionBurstFactor: 2.5,
                },
            }),
            getIdAsync: async () => ({
                initialized: true,
                uniqueIdentifier: "participant::sandbox",
            }),
            currentTimeAsync: async () => ({
                currentTime: "1710000000000",
            }),
        } as any);

        const options = new RequestOptions({
            timeoutMs: 1_000,
        });

        const commandInspection = new CommandInspectionServiceClient(transport);

        const identityProviderConfig = new IdentityProviderConfigServiceClient(
            transport,
        );

        const resourceManagement = new ResourceManagementServiceClient(
            transport,
        );

        const identityInitialization = new IdentityInitializationServiceClient(
            transport,
        );

        const commandStatuses = await commandInspection.getCommandStatusAsync(
            new GetCommandStatusRequest({
                commandIdPrefix: "cmd-",
                state: CommandState.succeeded,
                limit: 10,
            }),
            options,
        );

        const identityProvider =
            await identityProviderConfig.getIdentityProviderConfigAsync(
                new GetIdentityProviderConfigRequest({
                    identityProviderId: "idp-1",
                }),
                options,
            );

        const identityProviders =
            await identityProviderConfig.listIdentityProviderConfigsAsync(
                new ListIdentityProviderConfigsRequest(),
                options,
            );

        const resourceLimits = await resourceManagement.getResourceLimitsAsync(
            new GetResourceLimitsRequest(),
            options,
        );

        const identity = await identityInitialization.getIdAsync(
            new GetIdRequest(),
            options,
        );

        const currentTime = await identityInitialization.currentTimeAsync(
            new CurrentTimeRequest(),
            options,
        );

        expect(commandStatuses.commandStatuses[0]).toMatchObject({
            state: CommandState.succeeded,
            synchronizerId: "sync-1",
        });
        expect(
            identityProvider.identityProviderConfig?.identityProviderId,
        ).toBe("idp-1");
        expect(identityProviders.identityProviderConfigs).toHaveLength(1);
        expect(
            resourceLimits.currentLimits?.maxSubmissionBurstFactor,
        ).toBe(2.5);
        expect(identity.uniqueIdentifier).toBe("participant::sandbox");
        expect(currentTime.currentTime).toBe("1710000000000");
    });
});
