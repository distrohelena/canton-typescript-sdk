import { describe, expect, it } from "vitest";
import {
    CommandInspectionServiceClient,
    GetIdentityProviderConfigRequest,
    IdentityInitializationServiceClient,
    IdentityProviderConfigServiceClient,
    ListIdentityProviderConfigsRequest,
    RequestOptions,
    ResourceManagementServiceClient,
} from "../../../src";
import {
    CommandState,
    GetCommandStatusRequest,
} from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/command_inspection_service.js";
import {
    CurrentTimeRequest,
    CurrentTimeResponse,
    GetIdRequest,
    GetIdResponse,
} from "../../../src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/initialization_service.js";
import {
    GetResourceLimitsRequest,
    GetResourceLimitsResponse,
} from "../../../src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/resource_management_service.js";
import { GrpcTransport } from "../../../src/transports/grpc/grpc-transport.js";

describe("GrpcTransport batch 2 read services", () => {
    it("maps ledger-admin and participant-admin read methods", async () => {
        const getIdResponse = GetIdResponse.create({
            initialized: true,
            uniqueIdentifier: "participant::sandbox",
        });
        const currentTimeResponse = CurrentTimeResponse.create({
            currentTime: "1710000000000",
        });
        const resourceLimitsResponse = GetResourceLimitsResponse.create({
            currentLimits: {
                maxInflightValidationRequests: 50,
                maxSubmissionRate: 100,
                maxSubmissionBurstFactor: 2.5,
            },
        });

        const transport = new GrpcTransport({
            getHealthAsync: async () => ({ version: "3.4.0", features: {} }),
            checkHealthAsync: async () => ({ status: 1 }),
            createPartyAsync: async () => ({ identifier: "unused" }),
            listPartiesAsync: async () => ({ partyDetails: [], nextPageToken: "" }),
            grantUserRightsAsync: async () => ({ rights: [] }),
            uploadPackageAsync: async () => ({ packageId: "unused" }),
            queryContractsAsync: async () => ({ activeContracts: [] }),
            getUpdatesAsync: async () => [],
            submitCommandAsync: async () => ({ updateId: "unused" }),
            getCommandStatusAsync: async () => ({
                commandStatus: [
                    {
                        state: 2,
                        synchronizerId: "sync-1",
                        commands: [
                            {
                                command: {
                                    oneofKind: "create",
                                    create: {
                                        templateId: {
                                            packageId: "pkg-id",
                                            moduleName: "Main",
                                            entityName: "Iou",
                                        },
                                        createArguments: {
                                            recordId: {
                                                packageId: "pkg-id",
                                                moduleName: "Main",
                                                entityName: "IouArguments",
                                            },
                                            fields: [],
                                        },
                                    },
                                },
                            },
                        ],
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
            getResourceLimitsAsync: async () => resourceLimitsResponse,
            getIdAsync: async () => getIdResponse,
            currentTimeAsync: async () => currentTimeResponse,
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
            GetCommandStatusRequest.create({
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
            GetResourceLimitsRequest.create(),
            options,
        );

        const identity = await identityInitialization.getIdAsync(
            GetIdRequest.create(),
            options,
        );

        const currentTime = await identityInitialization.currentTimeAsync(
            CurrentTimeRequest.create(),
            options,
        );

        expect(commandStatuses.commandStatus[0]).toMatchObject({
            state: CommandState.SUCCEEDED,
            synchronizerId: "sync-1",
        });
        expect(commandStatuses.commandStatus[0].commands[0]).toMatchObject({
            command: { create: { templateId: {
                packageId: "pkg-id",
                moduleName: "Main",
                entityName: "Iou",
            }, createArguments: {
                recordId: {
                    packageId: "pkg-id",
                    moduleName: "Main",
                    entityName: "IouArguments",
                },
            } } },
        });
        expect(
            identityProvider.identityProviderConfig?.identityProviderId,
        ).toBe("idp-1");
        expect(identityProviders.identityProviderConfigs).toHaveLength(1);
        expect(resourceLimits).toBe(resourceLimitsResponse);
        expect(identity).toBe(getIdResponse);
        expect(currentTime).toBe(currentTimeResponse);
    });
});
