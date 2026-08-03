import { AllocatePartyRequest } from "../../core/types/requests/allocate-party-request.js";
import { GetActiveContractsRequest } from "../../core/types/requests/get-active-contracts-request.js";
import { GetUserRequest } from "../../core/types/requests/get-user-request.js";
import { ListKnownPartiesRequest } from "../../core/types/requests/list-known-parties-request.js";
import { ListPartyToParticipantRequest } from "../../core/types/requests/list-party-to-participant-request.js";
import { ListUserRightsRequest } from "../../core/types/requests/list-user-rights-request.js";
import { ListUsersRequest } from "../../core/types/requests/list-users-request.js";
import { SubmitCommandsRequest } from "../../core/types/requests/submit-commands-request.js";
import { AllocatePartyResponse } from "../../core/types/responses/allocate-party-response.js";
import { GetUserResponse } from "../../core/types/responses/get-user-response.js";
import { ListPartyToParticipantResponse } from "../../core/types/responses/list-party-to-participant-response.js";
import { ListUserRightsResponse } from "../../core/types/responses/list-user-rights-response.js";
import { ListUsersResponse } from "../../core/types/responses/list-users-response.js";
import type {
    ListPartiesRequest as TopologyListPartiesRequest,
    ListPartiesResponse as TopologyListPartiesResponse,
    ListKeyOwnersRequest,
    ListKeyOwnersResponse,
} from "../grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_aggregation_service.js";
import type {
    AddTransactionsRequest,
    AddTransactionsResponse,
    AuthorizeRequest,
    AuthorizeResponse,
    CreateTemporaryTopologyStoreRequest,
    CreateTemporaryTopologyStoreResponse,
    DropTemporaryTopologyStoreRequest,
    DropTemporaryTopologyStoreResponse,
    GenerateTransactionsRequest,
    GenerateTransactionsResponse,
    ImportTopologySnapshotRequest,
    ImportTopologySnapshotResponse,
    ImportTopologySnapshotV2Request,
    ImportTopologySnapshotV2Response,
    SignTransactionsRequest,
    SignTransactionsResponse,
} from "../grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_write_service.js";
import type {
    GetContractRequest,
    GetContractResponse,
} from "../grpc/generated/canton/com/daml/ledger/api/v2/contract_service.js";
import type {
    AddPartyAsyncRequest,
    AddPartyAsyncResponse,
    ClearPartyOnboardingFlagRequest,
    ClearPartyOnboardingFlagResponse,
    GetHighestOffsetByTimestampRequest,
    GetHighestOffsetByTimestampResponse,
} from "../grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/party_management_service.js";
import type {
    GetEventsByContractIdRequest,
    GetEventsByContractIdResponse,
} from "../grpc/generated/canton/com/daml/ledger/api/v2/event_query_service.js";
import type {
    CurrentTimeRequest,
    CurrentTimeResponse,
    GetIdRequest,
    GetIdResponse,
} from "../grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/initialization_service.js";
import type {
    ListAllV2Request,
    ListAllV2Response,
    ListAllRequest,
    ListAllResponse,
    ListAvailableStoresRequest,
    ListAvailableStoresResponse,
    ListLsuAnnouncementRequest,
    ListLsuAnnouncementResponse,
    ListLsuSequencerConnectionSuccessorRequest,
    ListLsuSequencerConnectionSuccessorResponse,
    ListMediatorSynchronizerStateRequest,
    ListMediatorSynchronizerStateResponse,
    ListSequencingParametersStateRequest,
    ListSequencingParametersStateResponse,
    ListSynchronizerParametersStateRequest,
    ListSynchronizerParametersStateResponse,
    ListVettedPackagesRequest as TopologyListVettedPackagesRequest,
    ListVettedPackagesResponse as TopologyListVettedPackagesResponse,
    ListPartyHostingLimitsRequest,
    ListPartyHostingLimitsResponse,
    ListParticipantSynchronizerPermissionRequest,
    ListParticipantSynchronizerPermissionResponse,
    ListSynchronizerTrustCertificateRequest,
    ListSynchronizerTrustCertificateResponse,
    ListPartyToKeyMappingRequest,
    ListPartyToKeyMappingResponse,
    ListOwnerToKeyMappingRequest,
    ListOwnerToKeyMappingResponse,
    ListDecentralizedNamespaceDefinitionRequest,
    ListDecentralizedNamespaceDefinitionResponse,
    ListNamespaceDelegationRequest,
    ListNamespaceDelegationResponse,
    ListSequencerSynchronizerStateRequest,
    ListSequencerSynchronizerStateResponse,
} from "../grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.js";
import type {
    GetParticipantIdRequest,
    GetParticipantIdResponse,
    GetPartiesRequest,
    GetPartiesResponse,
} from "../grpc/generated/canton/com/daml/ledger/api/v2/admin/party_management_service.js";
import type {
    GetResourceLimitsRequest,
    GetResourceLimitsResponse,
} from "../grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/resource_management_service.js";
import type {
    GetNoWaitCommitmentsFromRequest,
    GetNoWaitCommitmentsFromResponse,
    GetParticipantScheduleRequest as GetParticipantPruningScheduleRequest,
    GetParticipantScheduleResponse as GetParticipantPruningScheduleResponse,
    GetScheduleRequest as GetPruningScheduleRequest,
    GetScheduleResponse as GetPruningScheduleResponse,
} from "../grpc/generated/canton/com/digitalasset/canton/admin/pruning/v30/pruning.js";
import type {
    AllocateExternalPartyRequest,
    AllocateExternalPartyResponse,
    GenerateExternalPartyTopologyRequest,
    GenerateExternalPartyTopologyResponse,
} from "../grpc/generated/canton/com/daml/ledger/api/v2/admin/party_management_service.js";
import type {
    GetSynchronizerIdRequest,
    GetSynchronizerIdResponse,
    ListConnectedSynchronizersRequest,
    ListConnectedSynchronizersResponse,
} from "../grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/synchronizer_connectivity_service.js";
import type {
    GetSafePruningOffsetRequest,
    GetSafePruningOffsetResponse,
} from "../grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/pruning_service.js";
import { ListKnownPartiesResponse } from "../../core/types/responses/list-known-parties-response.js";
import type {
    ListRegisteredSynchronizersRequest,
    ListRegisteredSynchronizersResponse,
} from "../grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/synchronizer_connectivity_service.js";
import type {
    ListPendingOperationsRequest,
    ListPendingOperationsResponse,
} from "../grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/participant_repair_service.js";
import type {
    CountInFlightRequest,
    CountInFlightResponse,
    GetConfigForSlowCounterParticipantsRequest,
    GetConfigForSlowCounterParticipantsResponse,
    GetIntervalsBehindForCounterParticipantsRequest,
    GetIntervalsBehindForCounterParticipantsResponse,
    LookupOffsetByTimeRequest,
    LookupOffsetByTimeResponse,
    LookupReceivedAcsCommitmentsRequest,
    LookupReceivedAcsCommitmentsResponse,
    LookupSentAcsCommitmentsRequest,
    LookupSentAcsCommitmentsResponse,
    InspectCommitmentContractsRequest,
    InspectCommitmentContractsResponse,
    OpenCommitmentRequest,
    OpenCommitmentResponse,
} from "../grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/participant_inspection_service.js";
import type {
    GetDarContentsRequest,
    GetDarContentsResponse,
    GetDarRequest,
    GetDarResponse,
    GetPackageContentsRequest,
    GetPackageContentsResponse,
    GetPackageReferencesRequest,
    GetPackageReferencesResponse,
    ListDarsRequest,
    ListDarsResponse,
    ListPackagesRequest as ParticipantListPackagesRequest,
    ListPackagesResponse as ParticipantListPackagesResponse,
} from "../grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/package_service.js";
import { SubmitCommandResponse } from "../../core/types/responses/submit-command-response.js";
import type {
    TrafficControlStateRequest,
    TrafficControlStateResponse,
} from "../grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/traffic_control_service.js";
import { NotSupportedError } from "../../core/errors/not-supported-error.js";
import type { HealthCheckRequest, HealthCheckResponse } from "../grpc/generated/canton/google/grpc/health/v1/health.js";
import { GetLedgerApiVersionResponse } from "../grpc/generated/canton/com/daml/ledger/api/v2/version_service.js";
import type { GetLedgerApiVersionRequest } from "../grpc/generated/canton/com/daml/ledger/api/v2/version_service.js";
import type { ParticipantStatusRequest, ParticipantStatusResponse } from "../grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/participant_status_service.js";
import type { GetIdentityProviderConfigRequest, GetIdentityProviderConfigResponse, ListIdentityProviderConfigsRequest, ListIdentityProviderConfigsResponse } from "../grpc/generated/canton/com/daml/ledger/api/v2/admin/identity_provider_config_service.js";
import { ObjectDisposedError } from "../../core/errors/object-disposed-error.js";
import { ITransport } from "../../core/transports/transport.interface.js";
import type {
    GetUpdateByHashRequest,
    GetUpdateByIdRequest,
    GetUpdateByOffsetRequest,
    GetUpdateResponse,
    GetUpdatesPageRequest,
    GetUpdatesPageResponse,
    GetUpdatesRequest,
    GetUpdatesResponse,
} from "../grpc/generated/canton/com/daml/ledger/api/v2/update_service.js";
import { ICommandSigner } from "../../core/signing/command-signer.interface.js";
import { RequestOptions } from "../../core/types/request-options.js";
import {
    mapJsonSubmitCommand,
    mapJsonSubmitCommandsRequest,
} from "./mappers/commands-mapper.js";
import type {
    ListKnownPackagesRequest,
    ListKnownPackagesResponse,
    UploadDarFileRequest,
} from "../grpc/generated/canton/com/daml/ledger/api/v2/admin/package_management_service.js";
import { UploadDarFileResponse } from "../grpc/generated/canton/com/daml/ledger/api/v2/admin/package_management_service.js";
import type {
    GetCommandStatusRequest,
    GetCommandStatusResponse,
} from "../grpc/generated/canton/com/daml/ledger/api/v2/admin/command_inspection_service.js";
import type {
    GetActiveContractsPageRequest,
    GetActiveContractsPageResponse,
    GetConnectedSynchronizersRequest,
    GetConnectedSynchronizersResponse,
    GetLedgerEndRequest,
    GetLedgerEndResponse,
    GetLatestPrunedOffsetsRequest,
    GetLatestPrunedOffsetsResponse,
} from "../grpc/generated/canton/com/daml/ledger/api/v2/state_service.js";
import {
    GetPackageRequest,
    GetPackageResponse,
    GetPackageStatusRequest,
    GetPackageStatusResponse,
    ListPackagesRequest,
    ListPackagesResponse,
    ListVettedPackagesRequest,
    ListVettedPackagesResponse,
} from "../grpc/generated/canton/com/daml/ledger/api/v2/package_service.js";
import {
    mapJsonAllocatePartyRequest,
    mapJsonCreateParty,
    mapJsonListParties,
} from "./mappers/parties-mapper.js";
import { mapJsonQueryContracts } from "./mappers/contracts-mapper.js";
import { mapJsonTransactionEvents } from "./mappers/events-mapper.js";
import { mapJsonGrantRights } from "./mappers/users-mapper.js";
import type { GrantUserRightsRequest, GrantUserRightsResponse } from "../grpc/generated/canton/com/daml/ledger/api/v2/admin/user_management_service.js";
import { IJsonHttpClient } from "./json-http-client.js";
import { CommitmentChunkObserver } from "../../services/participant-inspection/commitment-chunk-observer.interface.js";
import { ContractObserver } from "../../services/contracts/contract-observer.interface.js";
import { TransactionObserver } from "../../services/events/transaction-observer.interface.js";
import type {
    CompletionStreamResponse,
    GetCompletionsRequest,
} from "../grpc/generated/canton/com/daml/ledger/api/v2/command_completion_service.js";

export class JsonTransport implements ITransport {
    private disposed = false;

    public readonly features = {
        supportsCommandSigning: false,
    };

    public constructor(private readonly httpClient: IJsonHttpClient) {}

    public async disposeAsync(): Promise<void> {
        this.disposed = true;
    }

    public async getLedgerApiVersionAsync(
        _request?: GetLedgerApiVersionRequest,
        options?: RequestOptions,
    ): Promise<GetLedgerApiVersionResponse> {
        this.throwIfDisposed();

        const payload = await this.httpClient.getAsync("/v2/version", options);

        return GetLedgerApiVersionResponse.create({
            version:
                (payload as { version?: string }).version
                ?? "unknown",
        });
    }

    public async checkHealthAsync(
        _request: HealthCheckRequest,
        _options?: RequestOptions,
    ): Promise<HealthCheckResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "grpc.health.v1.Health.Check is not supported by json transport",
        );
    }

    public async allocatePartyAsync(
        request: AllocatePartyRequest,
        options?: RequestOptions,
    ): Promise<AllocatePartyResponse> {
        this.throwIfDisposed();

        const payload = await this.httpClient.postAsync(
            "/v2/parties",
            mapJsonAllocatePartyRequest(request),
            options,
        );

        const response = mapJsonCreateParty(
            payload as {
                result?: { partyDetails?: { party?: string } };
                partyDetails?: { party?: string };
            },
        );

        return new AllocatePartyResponse({
            party: response.party,
        });
    }

    public async listKnownPartiesAsync(
        request: ListKnownPartiesRequest,
        options?: RequestOptions,
    ): Promise<ListKnownPartiesResponse> {
        this.throwIfDisposed();

        const query = new URLSearchParams();

        if (request.identityProviderId) {
            query.set("identity-provider-id", request.identityProviderId);
        }

        if (request.filterParty) {
            query.set("filter-party", request.filterParty);
        }

        if (request.pageSize !== undefined) {
            query.set("pageSize", request.pageSize.toString());
        }

        if (request.pageToken) {
            query.set("pageToken", request.pageToken);
        }

        const path =
            query.size === 0 ? "/v2/parties" : `/v2/parties?${query.toString()}`;

        const payload = await this.httpClient.getAsync(path, options);

        const response = mapJsonListParties(
            payload as {
                partyDetails?: Array<{
                    party?: string;
                    isLocal?: boolean;
                    localMetadata?: { attributes?: Record<string, string> };
                    identityProviderId?: string;
                }>;
                nextPageToken?: string;
            },
        );

        return new ListKnownPartiesResponse({
            partyDetails: [...response.partyDetails],
            nextPageToken: response.nextPageToken,
        });
    }

    public async getParticipantIdAsync(
        _request: GetParticipantIdRequest,
        _options?: RequestOptions,
    ): Promise<GetParticipantIdResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "PartyManagementService.GetParticipantId is not supported by json transport",
        );
    }

    public async getPartiesAsync(
        _request: GetPartiesRequest,
        _options?: RequestOptions,
    ): Promise<GetPartiesResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "PartyManagementService.GetParties is not supported by json transport",
        );
    }

    public async generateExternalPartyTopologyAsync(
        _request: GenerateExternalPartyTopologyRequest,
        _options?: RequestOptions,
    ): Promise<GenerateExternalPartyTopologyResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "PartyManagementService.GenerateExternalPartyTopology is not supported by json transport",
        );
    }

    public async allocateExternalPartyAsync(
        _request: AllocateExternalPartyRequest,
        _options?: RequestOptions,
    ): Promise<AllocateExternalPartyResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "PartyManagementService.AllocateExternalParty is not supported by json transport",
        );
    }

    public async grantUserRightsAsync(
        request: GrantUserRightsRequest,
        options?: RequestOptions,
    ): Promise<GrantUserRightsResponse> {
        this.throwIfDisposed();

        const payload = await this.httpClient.postAsync(
            "/v1/user/rights/grant",
            {
                userId: request.userId,
                rights: request.rights.map((right) => {
                    switch (right.kind.oneofKind) {
                        case "participantAdmin": return { type: "participantAdmin" };
                        case "canActAs": return { type: "canActAs", party: right.kind.canActAs.party };
                        case "canReadAs": return { type: "canReadAs", party: right.kind.canReadAs.party };
                        case "identityProviderAdmin": return { type: "identityProviderAdmin" };
                        case "canActAsAnyParty": return { type: "canActAsAnyParty" };
                        case "canReadAsAnyParty": return { type: "canReadAsAnyParty" };
                        case "canExecuteAs": return { type: "canExecuteAs", party: right.kind.canExecuteAs.party };
                        case "canExecuteAsAnyParty": return { type: "canExecuteAsAnyParty" };
                        default: throw new Error("unsupported protobuf user right");
                    }
                }),
            },
            options,
        );

        return mapJsonGrantRights(
            payload as { result?: Array<{ type: string; party?: string }> },
        );
    }

    public async getCommandStatusAsync(
        _request: GetCommandStatusRequest,
        _options?: RequestOptions,
    ): Promise<GetCommandStatusResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "CommandInspectionService.GetCommandStatus is not supported by json transport",
        );
    }

    public async getUserAsync(
        _request: GetUserRequest,
        _options?: RequestOptions,
    ): Promise<GetUserResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "UserManagementService.GetUser is not supported by json transport",
        );
    }

    public async listUsersAsync(
        _request: ListUsersRequest,
        _options?: RequestOptions,
    ): Promise<ListUsersResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "UserManagementService.ListUsers is not supported by json transport",
        );
    }

    public async listUserRightsAsync(
        _request: ListUserRightsRequest,
        _options?: RequestOptions,
    ): Promise<ListUserRightsResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "UserManagementService.ListUserRights is not supported by json transport",
        );
    }

    public async uploadDarFileAsync(
        request: UploadDarFileRequest,
        options?: RequestOptions,
    ): Promise<UploadDarFileResponse> {
        this.throwIfDisposed();

        await this.httpClient.postAsync(
            "/v1/packages",
            {
                darFile: Array.from(request.darFile),
                submissionId: request.submissionId,
                vettingChange: request.vettingChange,
                synchronizerId: request.synchronizerId,
            },
            options,
        );

        return UploadDarFileResponse.create();
    }

    public async listPackagesAsync(
        _request: ListPackagesRequest,
        _options?: RequestOptions,
    ): Promise<ListPackagesResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "PackageService.ListPackages is not supported by json transport",
        );
    }

    public async listKnownPackagesAsync(
        _request: ListKnownPackagesRequest,
        _options?: RequestOptions,
    ): Promise<ListKnownPackagesResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "PackageManagementService.ListKnownPackages is not supported by json transport",
        );
    }

    public async getIdentityProviderConfigAsync(
        _request: GetIdentityProviderConfigRequest,
        _options?: RequestOptions,
    ): Promise<GetIdentityProviderConfigResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "IdentityProviderConfigService.GetIdentityProviderConfig is not supported by json transport",
        );
    }

    public async listIdentityProviderConfigsAsync(
        _request: ListIdentityProviderConfigsRequest,
        _options?: RequestOptions,
    ): Promise<ListIdentityProviderConfigsResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "IdentityProviderConfigService.ListIdentityProviderConfigs is not supported by json transport",
        );
    }

    public async getPackageAsync(
        _request: GetPackageRequest,
        _options?: RequestOptions,
    ): Promise<GetPackageResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "PackageService.GetPackage is not supported by json transport",
        );
    }

    public async getPackageStatusAsync(
        _request: GetPackageStatusRequest,
        _options?: RequestOptions,
    ): Promise<GetPackageStatusResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "PackageService.GetPackageStatus is not supported by json transport",
        );
    }

    public async listVettedPackagesAsync(
        _request: ListVettedPackagesRequest,
        _options?: RequestOptions,
    ): Promise<ListVettedPackagesResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "PackageService.ListVettedPackages is not supported by json transport",
        );
    }

    public async listParticipantPackagesAsync(
        _request: ParticipantListPackagesRequest,
        _options?: RequestOptions,
    ): Promise<ParticipantListPackagesResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "Participant PackageService.ListPackages is not supported by json transport",
        );
    }

    public async getParticipantPackageContentsAsync(
        _request: GetPackageContentsRequest,
        _options?: RequestOptions,
    ): Promise<GetPackageContentsResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "Participant PackageService.GetPackageContents is not supported by json transport",
        );
    }

    public async getParticipantPackageReferencesAsync(
        _request: GetPackageReferencesRequest,
        _options?: RequestOptions,
    ): Promise<GetPackageReferencesResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "Participant PackageService.GetPackageReferences is not supported by json transport",
        );
    }

    public async getParticipantDarAsync(
        _request: GetDarRequest,
        _options?: RequestOptions,
    ): Promise<GetDarResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "ParticipantPackageService.GetDar is not supported by json transport",
        );
    }

    public async listParticipantDarsAsync(
        _request: ListDarsRequest,
        _options?: RequestOptions,
    ): Promise<ListDarsResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "ParticipantPackageService.ListDars is not supported by json transport",
        );
    }

    public async getParticipantDarContentsAsync(
        _request: GetDarContentsRequest,
        _options?: RequestOptions,
    ): Promise<GetDarContentsResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "ParticipantPackageService.GetDarContents is not supported by json transport",
        );
    }

    public async getParticipantStatusAsync(
        _request: ParticipantStatusRequest,
        _options?: RequestOptions,
    ): Promise<ParticipantStatusResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "ParticipantStatusService.ParticipantStatus is not supported by json transport",
        );
    }

    public async lookupOffsetByTimeAsync(
        _request: LookupOffsetByTimeRequest,
        _options?: RequestOptions,
    ): Promise<LookupOffsetByTimeResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "ParticipantInspectionService.LookupOffsetByTime is not supported by json transport",
        );
    }

    public async openCommitmentAsync(
        _request: OpenCommitmentRequest,
        _observer: CommitmentChunkObserver<OpenCommitmentResponse>,
        _options?: RequestOptions,
    ): Promise<void> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "ParticipantInspectionService.OpenCommitment is not supported by json transport",
        );
    }

    public async inspectCommitmentContractsAsync(
        _request: InspectCommitmentContractsRequest,
        _observer: CommitmentChunkObserver<InspectCommitmentContractsResponse>,
        _options?: RequestOptions,
    ): Promise<void> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "ParticipantInspectionService.InspectCommitmentContracts is not supported by json transport",
        );
    }

    public async countInFlightAsync(
        _request: CountInFlightRequest,
        _options?: RequestOptions,
    ): Promise<CountInFlightResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "ParticipantInspectionService.CountInFlight is not supported by json transport",
        );
    }

    public async getConfigForSlowCounterParticipantsAsync(
        _request: GetConfigForSlowCounterParticipantsRequest,
        _options?: RequestOptions,
    ): Promise<GetConfigForSlowCounterParticipantsResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "ParticipantInspectionService.GetConfigForSlowCounterParticipants is not supported by json transport",
        );
    }

    public async getIntervalsBehindForCounterParticipantsAsync(
        _request: GetIntervalsBehindForCounterParticipantsRequest,
        _options?: RequestOptions,
    ): Promise<GetIntervalsBehindForCounterParticipantsResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "ParticipantInspectionService.GetIntervalsBehindForCounterParticipants is not supported by json transport",
        );
    }

    public async lookupSentAcsCommitmentsAsync(
        _request: LookupSentAcsCommitmentsRequest,
        _options?: RequestOptions,
    ): Promise<LookupSentAcsCommitmentsResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "ParticipantInspectionService.LookupSentAcsCommitments is not supported by json transport",
        );
    }

    public async lookupReceivedAcsCommitmentsAsync(
        _request: LookupReceivedAcsCommitmentsRequest,
        _options?: RequestOptions,
    ): Promise<LookupReceivedAcsCommitmentsResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "ParticipantInspectionService.LookupReceivedAcsCommitments is not supported by json transport",
        );
    }

    public async addPartyAsync(
        _request: AddPartyAsyncRequest,
        _options?: RequestOptions,
    ): Promise<AddPartyAsyncResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "ParticipantPartyManagementService.AddPartyAsync is not supported by json transport",
        );
    }

    public async clearPartyOnboardingFlagAsync(
        _request: ClearPartyOnboardingFlagRequest,
        _options?: RequestOptions,
    ): Promise<ClearPartyOnboardingFlagResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "ParticipantPartyManagementService.ClearPartyOnboardingFlag is not supported by json transport",
        );
    }

    public async getHighestOffsetByTimestampAsync(
        _request: GetHighestOffsetByTimestampRequest,
        _options?: RequestOptions,
    ): Promise<GetHighestOffsetByTimestampResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "ParticipantPartyManagementService.GetHighestOffsetByTimestamp is not supported by json transport",
        );
    }

    public async getSafePruningOffsetAsync(
        _request: GetSafePruningOffsetRequest,
        _options?: RequestOptions,
    ): Promise<GetSafePruningOffsetResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "PruningService.GetSafePruningOffset is not supported by json transport",
        );
    }

    public async getPruningScheduleAsync(
        _request: GetPruningScheduleRequest,
        _options?: RequestOptions,
    ): Promise<GetPruningScheduleResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "PruningService.GetSchedule is not supported by json transport",
        );
    }

    public async getParticipantPruningScheduleAsync(
        _request: GetParticipantPruningScheduleRequest,
        _options?: RequestOptions,
    ): Promise<GetParticipantPruningScheduleResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "PruningService.GetParticipantSchedule is not supported by json transport",
        );
    }

    public async getNoWaitCommitmentsFromAsync(
        _request: GetNoWaitCommitmentsFromRequest,
        _options?: RequestOptions,
    ): Promise<GetNoWaitCommitmentsFromResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "PruningService.GetNoWaitCommitmentsFrom is not supported by json transport",
        );
    }

    public async trafficControlStateAsync(
        _request: TrafficControlStateRequest,
        _options?: RequestOptions,
    ): Promise<TrafficControlStateResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "TrafficControlService.TrafficControlState is not supported by json transport",
        );
    }

    public async listConnectedSynchronizersAsync(
        _request: ListConnectedSynchronizersRequest,
        _options?: RequestOptions,
    ): Promise<ListConnectedSynchronizersResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "SynchronizerConnectivityService.ListConnectedSynchronizers is not supported by json transport",
        );
    }

    public async getSynchronizerIdAsync(
        _request: GetSynchronizerIdRequest,
        _options?: RequestOptions,
    ): Promise<GetSynchronizerIdResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "SynchronizerConnectivityService.GetSynchronizerId is not supported by json transport",
        );
    }

    public async listRegisteredSynchronizersAsync(
        _request: ListRegisteredSynchronizersRequest,
        _options?: RequestOptions,
    ): Promise<ListRegisteredSynchronizersResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "SynchronizerConnectivityService.ListRegisteredSynchronizers is not supported by json transport",
        );
    }

    public async listPendingOperationsAsync(
        _request: ListPendingOperationsRequest,
        _options?: RequestOptions,
    ): Promise<ListPendingOperationsResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "ParticipantRepairService.ListPendingOperations is not supported by json transport",
        );
    }

    public async getResourceLimitsAsync(
        _request: GetResourceLimitsRequest,
        _options?: RequestOptions,
    ): Promise<GetResourceLimitsResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "ResourceManagementService.GetResourceLimits is not supported by json transport",
        );
    }

    public async getIdAsync(
        _request: GetIdRequest,
        _options?: RequestOptions,
    ): Promise<GetIdResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "IdentityInitializationService.GetId is not supported by json transport",
        );
    }

    public async currentTimeAsync(
        _request: CurrentTimeRequest,
        _options?: RequestOptions,
    ): Promise<CurrentTimeResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "IdentityInitializationService.CurrentTime is not supported by json transport",
        );
    }

    public async getContractAsync(
        _request: GetContractRequest,
        _options?: RequestOptions,
    ): Promise<GetContractResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "ContractService.GetContract is not supported by json transport",
        );
    }

    public async getEventsByContractIdAsync(
        _request: GetEventsByContractIdRequest,
        _options?: RequestOptions,
    ): Promise<GetEventsByContractIdResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "EventQueryService.GetEventsByContractId is not supported by json transport",
        );
    }

    public async listNamespaceDelegationAsync(
        _request: ListNamespaceDelegationRequest,
        _options?: RequestOptions,
    ): Promise<ListNamespaceDelegationResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "TopologyManagerReadService.ListNamespaceDelegation is not supported by json transport",
        );
    }

    public async listDecentralizedNamespaceDefinitionAsync(
        _request: ListDecentralizedNamespaceDefinitionRequest,
        _options?: RequestOptions,
    ): Promise<ListDecentralizedNamespaceDefinitionResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "TopologyManagerReadService.ListDecentralizedNamespaceDefinition is not supported by json transport",
        );
    }

    public async listOwnerToKeyMappingAsync(
        _request: ListOwnerToKeyMappingRequest,
        _options?: RequestOptions,
    ): Promise<ListOwnerToKeyMappingResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "TopologyManagerReadService.ListOwnerToKeyMapping is not supported by json transport",
        );
    }

    public async listPartyToKeyMappingAsync(
        _request: ListPartyToKeyMappingRequest,
        _options?: RequestOptions,
    ): Promise<ListPartyToKeyMappingResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "TopologyManagerReadService.ListPartyToKeyMapping is not supported by json transport",
        );
    }

    public async listSynchronizerTrustCertificateAsync(
        _request: ListSynchronizerTrustCertificateRequest,
        _options?: RequestOptions,
    ): Promise<ListSynchronizerTrustCertificateResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "TopologyManagerReadService.ListSynchronizerTrustCertificate is not supported by json transport",
        );
    }

    public async listParticipantSynchronizerPermissionAsync(
        _request: ListParticipantSynchronizerPermissionRequest,
        _options?: RequestOptions,
    ): Promise<ListParticipantSynchronizerPermissionResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "TopologyManagerReadService.ListParticipantSynchronizerPermission is not supported by json transport",
        );
    }

    public async authorizeTopologyTransactionsAsync(
        _request: AuthorizeRequest,
        _options?: RequestOptions,
    ): Promise<AuthorizeResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "TopologyManagerWriteService.Authorize is not supported by json transport",
        );
    }

    public async addTopologyTransactionsAsync(
        _request: AddTransactionsRequest,
        _options?: RequestOptions,
    ): Promise<AddTransactionsResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "TopologyManagerWriteService.AddTransactions is not supported by json transport",
        );
    }

    public async importTopologySnapshotAsync(
        _request: ImportTopologySnapshotRequest,
        _options?: RequestOptions,
    ): Promise<ImportTopologySnapshotResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "TopologyManagerWriteService.ImportTopologySnapshot is not supported by json transport",
        );
    }

    public async importTopologySnapshotV2Async(
        _request: ImportTopologySnapshotV2Request,
        _options?: RequestOptions,
    ): Promise<ImportTopologySnapshotV2Response> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "TopologyManagerWriteService.ImportTopologySnapshotV2 is not supported by json transport",
        );
    }

    public async signTopologyTransactionsAsync(
        _request: SignTransactionsRequest,
        _options?: RequestOptions,
    ): Promise<SignTransactionsResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "TopologyManagerWriteService.SignTransactions is not supported by json transport",
        );
    }

    public async generateTopologyTransactionsAsync(
        _request: GenerateTransactionsRequest,
        _options?: RequestOptions,
    ): Promise<GenerateTransactionsResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "TopologyManagerWriteService.GenerateTransactions is not supported by json transport",
        );
    }

    public async createTemporaryTopologyStoreAsync(
        _request: CreateTemporaryTopologyStoreRequest,
        _options?: RequestOptions,
    ): Promise<CreateTemporaryTopologyStoreResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "TopologyManagerWriteService.CreateTemporaryTopologyStore is not supported by json transport",
        );
    }

    public async dropTemporaryTopologyStoreAsync(
        _request: DropTemporaryTopologyStoreRequest,
        _options?: RequestOptions,
    ): Promise<DropTemporaryTopologyStoreResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "TopologyManagerWriteService.DropTemporaryTopologyStore is not supported by json transport",
        );
    }

    public async listPartyHostingLimitsAsync(
        _request: ListPartyHostingLimitsRequest,
        _options?: RequestOptions,
    ): Promise<ListPartyHostingLimitsResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "TopologyManagerReadService.ListPartyHostingLimits is not supported by json transport",
        );
    }

    public async topologyListVettedPackagesAsync(
        _request: TopologyListVettedPackagesRequest,
        _options?: RequestOptions,
    ): Promise<TopologyListVettedPackagesResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "TopologyManagerReadService.ListVettedPackages is not supported by json transport",
        );
    }

    public async listPartyToParticipantAsync(
        _request: ListPartyToParticipantRequest,
        _options?: RequestOptions,
    ): Promise<ListPartyToParticipantResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "TopologyManagerReadService.ListPartyToParticipant is not supported by json transport",
        );
    }

    public async listSynchronizerParametersStateAsync(
        _request: ListSynchronizerParametersStateRequest,
        _options?: RequestOptions,
    ): Promise<ListSynchronizerParametersStateResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "TopologyManagerReadService.ListSynchronizerParametersState is not supported by json transport",
        );
    }

    public async listSequencingParametersStateAsync(
        _request: ListSequencingParametersStateRequest,
        _options?: RequestOptions,
    ): Promise<ListSequencingParametersStateResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "TopologyManagerReadService.ListSequencingParametersState is not supported by json transport",
        );
    }

    public async listMediatorSynchronizerStateAsync(
        _request: ListMediatorSynchronizerStateRequest,
        _options?: RequestOptions,
    ): Promise<ListMediatorSynchronizerStateResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "TopologyManagerReadService.ListMediatorSynchronizerState is not supported by json transport",
        );
    }

    public async listSequencerSynchronizerStateAsync(
        _request: ListSequencerSynchronizerStateRequest,
        _options?: RequestOptions,
    ): Promise<ListSequencerSynchronizerStateResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "TopologyManagerReadService.ListSequencerSynchronizerState is not supported by json transport",
        );
    }

    public async listLsuAnnouncementAsync(
        _request: ListLsuAnnouncementRequest,
        _options?: RequestOptions,
    ): Promise<ListLsuAnnouncementResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "TopologyManagerReadService.ListLsuAnnouncement is not supported by json transport",
        );
    }

    public async listLsuSequencerConnectionSuccessorAsync(
        _request: ListLsuSequencerConnectionSuccessorRequest,
        _options?: RequestOptions,
    ): Promise<ListLsuSequencerConnectionSuccessorResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "TopologyManagerReadService.ListLsuSequencerConnectionSuccessor is not supported by json transport",
        );
    }

    public async listAvailableStoresAsync(
        _request: any,
        _options?: RequestOptions,
    ): Promise<any> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "TopologyManagerReadService.ListAvailableStores is not supported by json transport",
        );
    }

    public async listAllAsync(
        _request: ListAllRequest,
        _options?: RequestOptions,
    ): Promise<ListAllResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "TopologyManagerReadService.ListAll is not supported by json transport",
        );
    }

    public async listAllV2Async(
        _request: any,
        _options?: RequestOptions,
    ): Promise<any> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "TopologyManagerReadService.ListAllV2 is not supported by json transport",
        );
    }

    public async topologyListPartiesAsync(
        _request: TopologyListPartiesRequest,
        _options?: RequestOptions,
    ): Promise<TopologyListPartiesResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "TopologyAggregationService.ListParties is not supported by json transport",
        );
    }

    public async listKeyOwnersAsync(
        _request: ListKeyOwnersRequest,
        _options?: RequestOptions,
    ): Promise<ListKeyOwnersResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "TopologyAggregationService.ListKeyOwners is not supported by json transport",
        );
    }

    public async getActiveContractsPageAsync(
        request: GetActiveContractsPageRequest,
        options?: RequestOptions,
    ): Promise<GetActiveContractsPageResponse> {
        this.throwIfDisposed();

        void request;
        void options;

        throw new NotSupportedError(
            "StateService.GetActiveContractsPage is not supported by json transport",
        );
    }

    public async getConnectedSynchronizersAsync(
        _request: GetConnectedSynchronizersRequest,
        _options?: RequestOptions,
    ): Promise<GetConnectedSynchronizersResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "StateService.GetConnectedSynchronizers is not supported by json transport",
        );
    }

    public async getLedgerEndAsync(
        _request: GetLedgerEndRequest,
        _options?: RequestOptions,
    ): Promise<GetLedgerEndResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "StateService.GetLedgerEnd is not supported by json transport",
        );
    }

    public async getLatestPrunedOffsetsAsync(
        _request: GetLatestPrunedOffsetsRequest,
        _options?: RequestOptions,
    ): Promise<GetLatestPrunedOffsetsResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "StateService.GetLatestPrunedOffsets is not supported by json transport",
        );
    }

    public async getActiveContractsAsync(
        request: GetActiveContractsRequest,
        observer: ContractObserver,
        options?: RequestOptions,
    ): Promise<void> {
        this.throwIfDisposed();

        const payload = await this.httpClient.postAsync(
            "/v1/stream/query",
            {
                party: request.party,
                templateIds: request.templateId ? [request.templateId] : [],
            },
            options,
        );

        const events = mapJsonTransactionEvents(
            payload as { events?: unknown[] },
        );

        for (const event of events) {
            await observer.nextAsync(event);
        }
    }

    public getUpdatesAsync(
        _request: GetUpdatesRequest,
        _options?: RequestOptions,
    ): AsyncIterable<GetUpdatesResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "UpdateService.GetUpdates is gRPC-only; JSON supports StateService.getActiveContractsAsync instead",
        );
    }

    public async getUpdateByOffsetAsync(
        _request: GetUpdateByOffsetRequest,
        _options?: RequestOptions,
    ): Promise<GetUpdateResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "UpdateService.GetUpdateByOffset is not supported by json transport",
        );
    }

    public async getUpdateByIdAsync(
        _request: GetUpdateByIdRequest,
        _options?: RequestOptions,
    ): Promise<GetUpdateResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "UpdateService.GetUpdateById is not supported by json transport",
        );
    }

    public async getUpdateByHashAsync(
        _request: GetUpdateByHashRequest,
        _options?: RequestOptions,
    ): Promise<GetUpdateResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "UpdateService.GetUpdateByHash is not supported by json transport",
        );
    }

    public async getUpdatesPageAsync(
        _request: GetUpdatesPageRequest,
        _options?: RequestOptions,
    ): Promise<GetUpdatesPageResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "UpdateService.GetUpdatesPage is not supported by json transport",
        );
    }

    public getCompletionsAsync(
        _request: GetCompletionsRequest,
        _options?: RequestOptions,
    ): AsyncIterable<CompletionStreamResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "CommandCompletionService.GetCompletions is not supported by json transport",
        );
    }

    public async submitCommandAsync(
        request: SubmitCommandsRequest,
        signer?: ICommandSigner,
        options?: RequestOptions,
    ): Promise<SubmitCommandResponse> {
        this.throwIfDisposed();

        if (signer) {
            throw new NotSupportedError(
                "command signing is not supported by json transport",
            );
        }

        const payload = await this.httpClient.postAsync(
            "/v2/commands/submit-and-wait",
            mapJsonSubmitCommandsRequest(request),
            options,
        );

        return mapJsonSubmitCommand(
            payload as {
                result?: {
                    commandId?: string;
                    transactionId?: string;
                    updateId?: string;
                };
                commandId?: string;
                transactionId?: string;
                updateId?: string;
                completionOffset?: string;
            },
        );
    }

    private throwIfDisposed(): void {
        if (this.disposed) {
            throw new ObjectDisposedError(
                "The client or transport has been disposed.",
            );
        }
    }
}

