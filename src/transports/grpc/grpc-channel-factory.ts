import { GrpcTransport as ProtobufGrpcTransport } from "@protobuf-ts/grpc-transport";
import { CantonClientOptions } from "../../client/canton-client-options.js";
import {
    IPackageServiceClient as IParticipantPackageServiceClient,
    PackageServiceClient as ParticipantPackageServiceClient,
} from "./generated/canton/com/digitalasset/canton/admin/participant/v30/package_service.client.js";
import {
    IParticipantStatusServiceClient,
    ParticipantStatusServiceClient,
} from "./generated/canton/com/digitalasset/canton/admin/participant/v30/participant_status_service.client.js";
import {
    IPackageManagementServiceClient,
    PackageManagementServiceClient,
} from "./generated/canton/com/daml/ledger/api/v2/admin/package_management_service.client.js";
import {
    IPackageServiceClient as ILedgerPackageServiceClient,
    PackageServiceClient as LedgerPackageServiceClient,
} from "./generated/canton/com/daml/ledger/api/v2/package_service.client.js";
import {
    IPartyManagementServiceClient,
    PartyManagementServiceClient,
} from "./generated/canton/com/daml/ledger/api/v2/admin/party_management_service.client.js";
import {
    IUserManagementServiceClient,
    UserManagementServiceClient,
} from "./generated/canton/com/daml/ledger/api/v2/admin/user_management_service.client.js";
import {
    IVersionServiceClient,
    VersionServiceClient,
} from "./generated/canton/com/daml/ledger/api/v2/version_service.client.js";
import {
    ICommandServiceClient,
    CommandServiceClient,
} from "./generated/canton/com/daml/ledger/api/v2/command_service.client.js";
import {
    IStateServiceClient,
    StateServiceClient,
} from "./generated/canton/com/daml/ledger/api/v2/state_service.client.js";
import {
    IUpdateServiceClient,
    UpdateServiceClient,
} from "./generated/canton/com/daml/ledger/api/v2/update_service.client.js";
import {
    HealthClient,
    IHealthClient,
} from "./generated/canton/google/grpc/health/v1/health.client.js";
import {
    GetActiveContractsPageRequest,
    GetActiveContractsPageResponse,
} from "./generated/canton/com/daml/ledger/api/v2/state_service.js";
import {
    GetUpdatesRequest,
    GetUpdatesResponse,
} from "./generated/canton/com/daml/ledger/api/v2/update_service.js";
import { ListVettedPackagesRequest as GrpcListVettedPackagesRequest } from "./generated/canton/com/daml/ledger/api/v2/package_service.js";
import { HealthCheckRequest, HealthCheckResponse } from "./generated/canton/google/grpc/health/v1/health.js";
import {
    SubmitAndWaitRequest,
    SubmitAndWaitResponse,
} from "./generated/canton/com/daml/ledger/api/v2/command_service.js";
import { UploadDarFileRequest } from "./generated/canton/com/daml/ledger/api/v2/admin/package_management_service.js";
import {
    AllocatePartyRequest,
    AllocatePartyResponse,
    ListKnownPartiesRequest,
    ListKnownPartiesResponse,
} from "./generated/canton/com/daml/ledger/api/v2/admin/party_management_service.js";
import {
    GrantUserRightsRequest,
    GrantUserRightsResponse,
} from "./generated/canton/com/daml/ledger/api/v2/admin/user_management_service.js";
import { GetLedgerApiVersionResponse } from "./generated/canton/com/daml/ledger/api/v2/version_service.js";
import {
    buildGrpcCallOptionsAsync,
    createGrpcChannelCredentials,
} from "./grpc-call-options-factory.js";
import { RequestOptions } from "../../core/types/request-options.js";
import { GrpcChannelSecurity } from "../../core/types/grpc-channel-security.js";

export interface GrpcOperations {
    disposeAsync?(): Promise<void>;
    checkHealthAsync(request: unknown, options?: RequestOptions): Promise<unknown>;
    getHealthAsync(options?: RequestOptions): Promise<unknown>;
    createPartyAsync(request: unknown, options?: RequestOptions): Promise<unknown>;
    listPartiesAsync(request: unknown, options?: RequestOptions): Promise<unknown>;
    grantUserRightsAsync(request: unknown, options?: RequestOptions): Promise<unknown>;
    uploadPackageAsync(request: unknown, options?: RequestOptions): Promise<unknown>;
    listPackagesAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    getPackageAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    getPackageStatusAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    listVettedPackagesAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    listParticipantPackagesAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    getParticipantPackageContentsAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    getParticipantPackageReferencesAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    getParticipantStatusAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    queryContractsAsync(request: unknown, options?: RequestOptions): Promise<unknown>;
    streamTransactionsAsync(request: unknown, options?: RequestOptions): Promise<unknown>;
    submitCommandAsync(request: unknown, options?: RequestOptions): Promise<unknown>;
}

interface UnaryCallLike<TResponse> {
    response: Promise<TResponse>;
}

interface ServerStreamingCallLike<TResponse> {
    responses: AsyncIterable<TResponse>;
    status?: Promise<unknown>;
}

export interface GrpcOperationDependencies {
    versionServiceClient?: Pick<IVersionServiceClient, "getLedgerApiVersion">;
    healthClient?: Pick<IHealthClient, "check">;
    partyManagementServiceClient?: Pick<
        IPartyManagementServiceClient,
        "allocateParty" | "listKnownParties"
    >;
    userManagementServiceClient?: Pick<
        IUserManagementServiceClient,
        "grantUserRights"
    >;
    packageManagementServiceClient?: Pick<
        IPackageManagementServiceClient,
        "uploadDarFile"
    >;
    ledgerPackageServiceClient?: Pick<
        ILedgerPackageServiceClient,
        "listPackages" | "getPackage" | "getPackageStatus" | "listVettedPackages"
    >;
    participantPackageServiceClient?: Pick<
        IParticipantPackageServiceClient,
        "listPackages" | "getPackageContents" | "getPackageReferences"
    >;
    participantStatusServiceClient?: Pick<
        IParticipantStatusServiceClient,
        "participantStatus"
    >;
    stateServiceClient?: Pick<IStateServiceClient, "getActiveContractsPage">;
    updateServiceClient?: Pick<IUpdateServiceClient, "getUpdates">;
    commandServiceClient?: Pick<ICommandServiceClient, "submitAndWait">;
}

export function createGrpcOperations(
    options: CantonClientOptions,
    endpoint: string,
    grpcChannelSecurity: GrpcChannelSecurity,
    dependencies: GrpcOperationDependencies = {},
): GrpcOperations {
    const rpcTransport = new ProtobufGrpcTransport({
        host: normalizeGrpcHost(endpoint),
        channelCredentials: createGrpcChannelCredentials(
            grpcChannelSecurity,
        ),
        clientOptions:
            options.grpcConnectTimeoutMs === undefined
                ? undefined
                : {
                    connectTimeoutMs: options.grpcConnectTimeoutMs,
                },
    });

    const versionServiceClient =
        dependencies.versionServiceClient ?? new VersionServiceClient(rpcTransport);

    const healthClient = dependencies.healthClient ?? new HealthClient(rpcTransport);

    const partyManagementServiceClient =
        dependencies.partyManagementServiceClient
        ?? new PartyManagementServiceClient(rpcTransport);

    const userManagementServiceClient =
        dependencies.userManagementServiceClient
        ?? new UserManagementServiceClient(rpcTransport);

    const packageManagementServiceClient =
        dependencies.packageManagementServiceClient
        ?? new PackageManagementServiceClient(rpcTransport);

    const ledgerPackageServiceClient =
        dependencies.ledgerPackageServiceClient
        ?? new LedgerPackageServiceClient(rpcTransport);

    const participantPackageServiceClient =
        dependencies.participantPackageServiceClient
        ?? new ParticipantPackageServiceClient(rpcTransport);

    const participantStatusServiceClient =
        dependencies.participantStatusServiceClient
        ?? new ParticipantStatusServiceClient(rpcTransport);

    const stateServiceClient =
        dependencies.stateServiceClient ?? new StateServiceClient(rpcTransport);

    const updateServiceClient =
        dependencies.updateServiceClient ?? new UpdateServiceClient(rpcTransport);

    const commandServiceClient =
        dependencies.commandServiceClient
        ?? new CommandServiceClient(rpcTransport);

    return {
        async disposeAsync(): Promise<void> {
            rpcTransport.close();
        },
        async checkHealthAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<HealthCheckResponse> {
            const callOptions = await buildGrpcCallOptionsAsync(
                options.authProvider,
                options.defaultRequestTimeoutMs,
                requestOptions,
            );

            return await unwrapUnaryResponse(
                healthClient.check(request as HealthCheckRequest, callOptions),
            );
        },
        async getHealthAsync(
            requestOptions?: RequestOptions,
        ): Promise<GetLedgerApiVersionResponse> {
            const callOptions = await buildGrpcCallOptionsAsync(
                options.authProvider,
                options.defaultRequestTimeoutMs,
                requestOptions,
            );

            return await unwrapUnaryResponse(
                versionServiceClient.getLedgerApiVersion({}, callOptions),
            );
        },
        async createPartyAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<AllocatePartyResponse> {
            const callOptions = await buildGrpcCallOptionsAsync(
                options.authProvider,
                options.defaultRequestTimeoutMs,
                requestOptions,
            );

            return await unwrapUnaryResponse(
                partyManagementServiceClient.allocateParty(
                    request as AllocatePartyRequest,
                    callOptions,
                ),
            );
        },
        async listPartiesAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<ListKnownPartiesResponse> {
            const callOptions = await buildGrpcCallOptionsAsync(
                options.authProvider,
                options.defaultRequestTimeoutMs,
                requestOptions,
            );

            return await unwrapUnaryResponse(
                partyManagementServiceClient.listKnownParties(
                    request as ListKnownPartiesRequest,
                    callOptions,
                ),
            );
        },
        async grantUserRightsAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<GrantUserRightsResponse> {
            const callOptions = await buildGrpcCallOptionsAsync(
                options.authProvider,
                options.defaultRequestTimeoutMs,
                requestOptions,
            );

            return await unwrapUnaryResponse(
                userManagementServiceClient.grantUserRights(
                    request as GrantUserRightsRequest,
                    callOptions,
                ),
            );
        },
        async uploadPackageAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<unknown> {
            const callOptions = await buildGrpcCallOptionsAsync(
                options.authProvider,
                options.defaultRequestTimeoutMs,
                requestOptions,
            );

            return await unwrapUnaryResponse(
                packageManagementServiceClient.uploadDarFile(
                    request as UploadDarFileRequest,
                    callOptions,
                ),
            );
        },
        async listPackagesAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<unknown> {
            const callOptions = await buildGrpcCallOptionsAsync(
                options.authProvider,
                options.defaultRequestTimeoutMs,
                requestOptions,
            );

            return await unwrapUnaryResponse(
                ledgerPackageServiceClient.listPackages(
                    request as Record<string, never>,
                    callOptions,
                ),
            );
        },
        async getPackageAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<unknown> {
            const callOptions = await buildGrpcCallOptionsAsync(
                options.authProvider,
                options.defaultRequestTimeoutMs,
                requestOptions,
            );

            return await unwrapUnaryResponse(
                ledgerPackageServiceClient.getPackage(
                    request as { packageId: string },
                    callOptions,
                ),
            );
        },
        async getPackageStatusAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<unknown> {
            const callOptions = await buildGrpcCallOptionsAsync(
                options.authProvider,
                options.defaultRequestTimeoutMs,
                requestOptions,
            );

            return await unwrapUnaryResponse(
                ledgerPackageServiceClient.getPackageStatus(
                    request as { packageId: string },
                    callOptions,
                ),
            );
        },
        async listVettedPackagesAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<unknown> {
            const callOptions = await buildGrpcCallOptionsAsync(
                options.authProvider,
                options.defaultRequestTimeoutMs,
                requestOptions,
            );

            return await unwrapUnaryResponse(
                ledgerPackageServiceClient.listVettedPackages(
                    request as GrpcListVettedPackagesRequest,
                    callOptions,
                ),
            );
        },
        async listParticipantPackagesAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<unknown> {
            const callOptions = await buildGrpcCallOptionsAsync(
                options.authProvider,
                options.defaultRequestTimeoutMs,
                requestOptions,
            );

            return await unwrapUnaryResponse(
                participantPackageServiceClient.listPackages(
                    request as {
                        limit: number;
                        filterName: string;
                    },
                    callOptions,
                ),
            );
        },
        async getParticipantPackageContentsAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<unknown> {
            const callOptions = await buildGrpcCallOptionsAsync(
                options.authProvider,
                options.defaultRequestTimeoutMs,
                requestOptions,
            );

            return await unwrapUnaryResponse(
                participantPackageServiceClient.getPackageContents(
                    request as { packageId: string },
                    callOptions,
                ),
            );
        },
        async getParticipantPackageReferencesAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<unknown> {
            const callOptions = await buildGrpcCallOptionsAsync(
                options.authProvider,
                options.defaultRequestTimeoutMs,
                requestOptions,
            );

            return await unwrapUnaryResponse(
                participantPackageServiceClient.getPackageReferences(
                    request as { packageId: string },
                    callOptions,
                ),
            );
        },
        async getParticipantStatusAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<unknown> {
            const callOptions = await buildGrpcCallOptionsAsync(
                options.authProvider,
                options.defaultRequestTimeoutMs,
                requestOptions,
            );

            return await unwrapUnaryResponse(
                participantStatusServiceClient.participantStatus(
                    request as Record<string, never>,
                    callOptions,
                ),
            );
        },
        async queryContractsAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<GetActiveContractsPageResponse> {
            const callOptions = await buildGrpcCallOptionsAsync(
                options.authProvider,
                options.defaultRequestTimeoutMs,
                requestOptions,
            );

            return await unwrapUnaryResponse(
                stateServiceClient.getActiveContractsPage(
                    request as GetActiveContractsPageRequest,
                    callOptions,
                ),
            );
        },
        async streamTransactionsAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<GetUpdatesResponse[]> {
            const callOptions = await buildGrpcCallOptionsAsync(
                options.authProvider,
                options.defaultRequestTimeoutMs,
                requestOptions,
            );

            return await collectServerResponsesAsync(
                updateServiceClient.getUpdates(
                    request as GetUpdatesRequest,
                    callOptions,
                ),
            );
        },
        async submitCommandAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<SubmitAndWaitResponse> {
            const callOptions = await buildGrpcCallOptionsAsync(
                options.authProvider,
                options.defaultRequestTimeoutMs,
                requestOptions,
            );

            return await unwrapUnaryResponse(
                commandServiceClient.submitAndWait(
                    request as SubmitAndWaitRequest,
                    callOptions,
                ),
            );
        },
    };
}

function normalizeGrpcHost(endpoint: string): string {
    if (endpoint.includes("://")) {
        return new URL(endpoint).host;
    }

    return endpoint;
}

async function unwrapUnaryResponse<TResponse>(
    call: UnaryCallLike<TResponse>,
): Promise<TResponse> {
    return await call.response;
}

async function collectServerResponsesAsync<TResponse>(
    call: ServerStreamingCallLike<TResponse>,
): Promise<TResponse[]> {
    const responses: TResponse[] = [];

    for await (const response of call.responses) {
        responses.push(response);
    }

    await call.status;

    return responses;
}
