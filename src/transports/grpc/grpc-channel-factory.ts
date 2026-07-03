import { GrpcTransport as ProtobufGrpcTransport } from "@protobuf-ts/grpc-transport";
import { CantonClientOptions } from "../../client/canton-client-options.js";
import {
    IPackageManagementServiceClient,
    PackageManagementServiceClient,
} from "./generated/canton/com/daml/ledger/api/v2/admin/package_management_service.client.js";
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

export interface GrpcOperations {
    checkHealthAsync(request: unknown): Promise<unknown>;
    getHealthAsync(): Promise<unknown>;
    createPartyAsync(request: unknown): Promise<unknown>;
    listPartiesAsync(request: unknown): Promise<unknown>;
    grantUserRightsAsync(request: unknown): Promise<unknown>;
    uploadPackageAsync(request: unknown): Promise<unknown>;
    queryContractsAsync(request: unknown): Promise<unknown>;
    streamTransactionsAsync(request: unknown): Promise<unknown>;
    submitCommandAsync(request: unknown): Promise<unknown>;
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
    stateServiceClient?: Pick<IStateServiceClient, "getActiveContractsPage">;
    updateServiceClient?: Pick<IUpdateServiceClient, "getUpdates">;
    commandServiceClient?: Pick<ICommandServiceClient, "submitAndWait">;
}

export function createGrpcOperations(
    options: CantonClientOptions,
    dependencies: GrpcOperationDependencies = {},
): GrpcOperations {
    const rpcTransport = new ProtobufGrpcTransport({
        host: normalizeGrpcHost(options.endpoint),
        channelCredentials: createGrpcChannelCredentials(
            options.grpcChannelSecurity,
        ),
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

    const stateServiceClient =
        dependencies.stateServiceClient ?? new StateServiceClient(rpcTransport);

    const updateServiceClient =
        dependencies.updateServiceClient ?? new UpdateServiceClient(rpcTransport);

    const commandServiceClient =
        dependencies.commandServiceClient
        ?? new CommandServiceClient(rpcTransport);

    return {
        async checkHealthAsync(request: unknown): Promise<HealthCheckResponse> {
            const callOptions = await buildGrpcCallOptionsAsync(
                options.authProvider,
            );

            return await unwrapUnaryResponse(
                healthClient.check(request as HealthCheckRequest, callOptions),
            );
        },
        async getHealthAsync(): Promise<GetLedgerApiVersionResponse> {
            const callOptions = await buildGrpcCallOptionsAsync(
                options.authProvider,
            );

            return await unwrapUnaryResponse(
                versionServiceClient.getLedgerApiVersion({}, callOptions),
            );
        },
        async createPartyAsync(request: unknown): Promise<AllocatePartyResponse> {
            const callOptions = await buildGrpcCallOptionsAsync(
                options.authProvider,
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
        ): Promise<ListKnownPartiesResponse> {
            const callOptions = await buildGrpcCallOptionsAsync(
                options.authProvider,
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
        ): Promise<GrantUserRightsResponse> {
            const callOptions = await buildGrpcCallOptionsAsync(
                options.authProvider,
            );

            return await unwrapUnaryResponse(
                userManagementServiceClient.grantUserRights(
                    request as GrantUserRightsRequest,
                    callOptions,
                ),
            );
        },
        async uploadPackageAsync(request: unknown): Promise<unknown> {
            const callOptions = await buildGrpcCallOptionsAsync(
                options.authProvider,
            );

            return await unwrapUnaryResponse(
                packageManagementServiceClient.uploadDarFile(
                    request as UploadDarFileRequest,
                    callOptions,
                ),
            );
        },
        async queryContractsAsync(
            request: unknown,
        ): Promise<GetActiveContractsPageResponse> {
            const callOptions = await buildGrpcCallOptionsAsync(
                options.authProvider,
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
        ): Promise<GetUpdatesResponse[]> {
            const callOptions = await buildGrpcCallOptionsAsync(
                options.authProvider,
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
        ): Promise<SubmitAndWaitResponse> {
            const callOptions = await buildGrpcCallOptionsAsync(
                options.authProvider,
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
