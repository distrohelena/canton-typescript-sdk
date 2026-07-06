import { CantonClientOptions } from "../../client/canton-client-options.js";
import { AllocatePartyRequest } from "../../core/types/requests/allocate-party-request.js";
import { GetActiveContractsPageRequest } from "../../core/types/requests/get-active-contracts-page-request.js";
import { GetActiveContractsRequest } from "../../core/types/requests/get-active-contracts-request.js";
import { GetLedgerApiVersionRequest } from "../../core/types/requests/get-ledger-api-version-request.js";
import { GetPackageContentsRequest } from "../../core/types/requests/get-package-contents-request.js";
import { GetPackageReferencesRequest } from "../../core/types/requests/get-package-references-request.js";
import { GetPackageRequest } from "../../core/types/requests/get-package-request.js";
import { GetPackageStatusRequest } from "../../core/types/requests/get-package-status-request.js";
import { GetParticipantStatusRequest } from "../../core/types/requests/get-participant-status-request.js";
import { GrantUserRightsRequest } from "../../core/types/requests/grant-user-rights-request.js";
import { GetUpdatesRequest } from "../../core/types/requests/get-updates-request.js";
import { HealthCheckRequest } from "../../core/types/requests/health-check-request.js";
import { ListAllRequest } from "../../core/types/requests/list-all-request.js";
import { ListAllV2Request } from "../../core/types/requests/list-all-v2-request.js";
import { ListAvailableStoresRequest } from "../../core/types/requests/list-available-stores-request.js";
import { ListDecentralizedNamespaceDefinitionRequest } from "../../core/types/requests/list-decentralized-namespace-definition-request.js";
import { ListKeyOwnersRequest } from "../../core/types/requests/list-key-owners-request.js";
import { ListLsuAnnouncementRequest } from "../../core/types/requests/list-lsu-announcement-request.js";
import { ListLsuSequencerConnectionSuccessorRequest } from "../../core/types/requests/list-lsu-sequencer-connection-successor-request.js";
import { ListPackagesRequest } from "../../core/types/requests/list-packages-request.js";
import { ListMediatorSynchronizerStateRequest } from "../../core/types/requests/list-mediator-synchronizer-state-request.js";
import { ListVettedPackagesRequest } from "../../core/types/requests/list-vetted-packages-request.js";
import { ListKnownPartiesRequest } from "../../core/types/requests/list-known-parties-request.js";
import { ListNamespaceDelegationRequest } from "../../core/types/requests/list-namespace-delegation-request.js";
import { ListOwnerToKeyMappingRequest } from "../../core/types/requests/list-owner-to-key-mapping-request.js";
import { ListParticipantSynchronizerPermissionRequest } from "../../core/types/requests/list-participant-synchronizer-permission-request.js";
import { ParticipantListPackagesRequest } from "../../core/types/requests/participant-list-packages-request.js";
import { ListPartyHostingLimitsRequest } from "../../core/types/requests/list-party-hosting-limits-request.js";
import { ListPartyToKeyMappingRequest } from "../../core/types/requests/list-party-to-key-mapping-request.js";
import { ListPartyToParticipantRequest } from "../../core/types/requests/list-party-to-participant-request.js";
import { ListSequencerSynchronizerStateRequest } from "../../core/types/requests/list-sequencer-synchronizer-state-request.js";
import { ListSequencingParametersStateRequest } from "../../core/types/requests/list-sequencing-parameters-state-request.js";
import { ListSynchronizerParametersStateRequest } from "../../core/types/requests/list-synchronizer-parameters-state-request.js";
import { ListSynchronizerTrustCertificateRequest } from "../../core/types/requests/list-synchronizer-trust-certificate-request.js";
import { SubmitCommandRequest } from "../../core/types/requests/submit-command-request.js";
import { TopologyListPartiesRequest } from "../../core/types/requests/topology-list-parties-request.js";
import { TopologyListVettedPackagesRequest } from "../../core/types/requests/topology-list-vetted-packages-request.js";
import { UploadDarFileRequest } from "../../core/types/requests/upload-dar-file-request.js";
import { SignCommandResult } from "../../core/signing/sign-command-result.js";
import { AllocatePartyResponse as SdkAllocatePartyResponse } from "../../core/types/responses/allocate-party-response.js";
import { GetPackageContentsResponse } from "../../core/types/responses/get-package-contents-response.js";
import { GetPackageReferencesResponse } from "../../core/types/responses/get-package-references-response.js";
import { GetPackageResponse } from "../../core/types/responses/get-package-response.js";
import { GetPackageStatusResponse } from "../../core/types/responses/get-package-status-response.js";
import { GetParticipantStatusResponse } from "../../core/types/responses/get-participant-status-response.js";
import { GetActiveContractsPageResponse } from "../../core/types/responses/get-active-contracts-page-response.js";
import { GetLedgerApiVersionResponse as SdkGetLedgerApiVersionResponse } from "../../core/types/responses/get-ledger-api-version-response.js";
import { GrantUserRightsResponse } from "../../core/types/responses/grant-user-rights-response.js";
import { HealthCheckResponse } from "../../core/types/responses/health-check-response.js";
import { ListAllResponse } from "../../core/types/responses/list-all-response.js";
import { ListAllV2Response } from "../../core/types/responses/list-all-v2-response.js";
import { ListAvailableStoresResponse } from "../../core/types/responses/list-available-stores-response.js";
import { ListDecentralizedNamespaceDefinitionResponse } from "../../core/types/responses/list-decentralized-namespace-definition-response.js";
import { ListKeyOwnersResponse } from "../../core/types/responses/list-key-owners-response.js";
import { ListPackagesResponse } from "../../core/types/responses/list-packages-response.js";
import { ListKnownPartiesResponse as SdkListKnownPartiesResponse } from "../../core/types/responses/list-known-parties-response.js";
import { ListLsuAnnouncementResponse } from "../../core/types/responses/list-lsu-announcement-response.js";
import { ListLsuSequencerConnectionSuccessorResponse } from "../../core/types/responses/list-lsu-sequencer-connection-successor-response.js";
import { ListMediatorSynchronizerStateResponse } from "../../core/types/responses/list-mediator-synchronizer-state-response.js";
import { ListNamespaceDelegationResponse } from "../../core/types/responses/list-namespace-delegation-response.js";
import { ListOwnerToKeyMappingResponse } from "../../core/types/responses/list-owner-to-key-mapping-response.js";
import { ListParticipantSynchronizerPermissionResponse } from "../../core/types/responses/list-participant-synchronizer-permission-response.js";
import { ListPartyHostingLimitsResponse } from "../../core/types/responses/list-party-hosting-limits-response.js";
import { ListPartyToKeyMappingResponse } from "../../core/types/responses/list-party-to-key-mapping-response.js";
import { ListPartyToParticipantResponse } from "../../core/types/responses/list-party-to-participant-response.js";
import { ListSequencerSynchronizerStateResponse } from "../../core/types/responses/list-sequencer-synchronizer-state-response.js";
import { ListSequencingParametersStateResponse } from "../../core/types/responses/list-sequencing-parameters-state-response.js";
import { ListSynchronizerParametersStateResponse } from "../../core/types/responses/list-synchronizer-parameters-state-response.js";
import { ListSynchronizerTrustCertificateResponse } from "../../core/types/responses/list-synchronizer-trust-certificate-response.js";
import { ListVettedPackagesResponse } from "../../core/types/responses/list-vetted-packages-response.js";
import { ParticipantListPackagesResponse } from "../../core/types/responses/participant-list-packages-response.js";
import { SubmitCommandResponse } from "../../core/types/responses/submit-command-response.js";
import { TopologyListPartiesResponse } from "../../core/types/responses/topology-list-parties-response.js";
import { TopologyListVettedPackagesResponse } from "../../core/types/responses/topology-list-vetted-packages-response.js";
import { UploadDarFileResponse as SdkUploadDarFileResponse } from "../../core/types/responses/upload-dar-file-response.js";
import { NotSupportedError } from "../../core/errors/not-supported-error.js";
import { TransportError } from "../../core/errors/transport-error.js";
import { ITransport } from "../../core/transports/transport.interface.js";
import { PackageFormat } from "../../core/types/package-format.js";
import { RequestOptions } from "../../core/types/request-options.js";
import { GrpcChannelSecurity } from "../../core/types/grpc-channel-security.js";
import {
    createGrpcOperations,
    GrpcOperations,
} from "./grpc-channel-factory.js";
import {
    mapGrpcSubmitCommand,
    mapGrpcSubmitCommandRequest,
} from "./mappers/commands-mapper.js";
import { mapGrpcQueryContracts, mapGrpcQueryContractsRequest } from "./mappers/contracts-mapper.js";
import {
    mapGrpcStreamTransactionsRequest,
    mapGrpcTransactionEvents,
} from "./mappers/events-mapper.js";
import {
    mapGrpcGetPackage,
    mapGrpcGetPackageRequest,
    mapGrpcGetPackageStatus,
    mapGrpcGetPackageStatusRequest,
    mapGrpcGetParticipantPackageContents,
    mapGrpcGetParticipantPackageContentsRequest,
    mapGrpcGetParticipantPackageReferences,
    mapGrpcGetParticipantPackageReferencesRequest,
    mapGrpcListPackages,
    mapGrpcListPackagesRequest,
    mapGrpcListVettedPackages,
    mapGrpcListVettedPackagesRequest,
    mapGrpcParticipantListPackages,
    mapGrpcParticipantListPackagesRequest,
    mapGrpcUploadPackage,
    mapGrpcUploadPackageRequest,
} from "./mappers/packages-mapper.js";
import {
    mapGrpcGetParticipantStatusRequest,
    mapGrpcParticipantStatusResponse,
} from "./mappers/participant-status-mapper.js";
import { mapGrpcCreateParty, mapGrpcCreatePartyRequest, mapGrpcListParties, mapGrpcListPartiesRequest } from "./mappers/parties-mapper.js";
import {
    mapGrpcListKeyOwnersRequest,
    mapGrpcListKeyOwnersResponse,
    mapGrpcTopologyListPartiesRequest,
    mapGrpcTopologyListPartiesResponse,
} from "./mappers/topology-aggregation-mapper.js";
import {
    mapGrpcListAllRequest,
    mapGrpcListAllResponse,
    mapGrpcListAllV2Request,
    mapGrpcListAllV2Response,
    mapGrpcListAvailableStoresRequest,
    mapGrpcListAvailableStoresResponse,
    mapGrpcListDecentralizedNamespaceDefinitionRequest,
    mapGrpcListDecentralizedNamespaceDefinitionResponse,
    mapGrpcListLsuAnnouncementRequest,
    mapGrpcListLsuAnnouncementResponse,
    mapGrpcListLsuSequencerConnectionSuccessorRequest,
    mapGrpcListLsuSequencerConnectionSuccessorResponse,
    mapGrpcListMediatorSynchronizerStateRequest,
    mapGrpcListMediatorSynchronizerStateResponse,
    mapGrpcListNamespaceDelegationRequest,
    mapGrpcListNamespaceDelegationResponse,
    mapGrpcListOwnerToKeyMappingRequest,
    mapGrpcListOwnerToKeyMappingResponse,
    mapGrpcListParticipantSynchronizerPermissionRequest,
    mapGrpcListParticipantSynchronizerPermissionResponse,
    mapGrpcListPartyHostingLimitsRequest,
    mapGrpcListPartyHostingLimitsResponse,
    mapGrpcListPartyToKeyMappingRequest,
    mapGrpcListPartyToKeyMappingResponse,
    mapGrpcListPartyToParticipantRequest,
    mapGrpcListPartyToParticipantResponse,
    mapGrpcListSequencerSynchronizerStateRequest,
    mapGrpcListSequencerSynchronizerStateResponse,
    mapGrpcListSequencingParametersStateRequest,
    mapGrpcListSequencingParametersStateResponse,
    mapGrpcListSynchronizerParametersStateRequest,
    mapGrpcListSynchronizerParametersStateResponse,
    mapGrpcListSynchronizerTrustCertificateRequest,
    mapGrpcListSynchronizerTrustCertificateResponse,
    mapGrpcTopologyListVettedPackagesRequest,
    mapGrpcTopologyListVettedPackagesResponse,
} from "./mappers/topology-manager-read-mapper.js";
import {
    mapGrpcGrantUserRights,
    mapGrpcGrantUserRightsRequest,
} from "./mappers/users-mapper.js";
import { mapGrpcHealthCheckResponse } from "./mappers/health-mapper.js";
import { ContractObserver } from "../../services/contracts/contract-observer.interface.js";
import { TransactionObserver } from "../../services/events/transaction-observer.interface.js";
import { UploadDarFileResponse } from "./generated/canton/com/daml/ledger/api/v2/admin/package_management_service.js";
import {
    GetPackageResponse as ProtobufGetPackageResponse,
    GetPackageStatusResponse as ProtobufGetPackageStatusResponse,
    ListPackagesResponse as ProtobufListPackagesResponse,
    ListVettedPackagesResponse as ProtobufListVettedPackagesResponse,
} from "./generated/canton/com/daml/ledger/api/v2/package_service.js";
import { AllocatePartyResponse, ListKnownPartiesResponse } from "./generated/canton/com/daml/ledger/api/v2/admin/party_management_service.js";
import { GrantUserRightsResponse as ProtobufGrantUserRightsResponse } from "./generated/canton/com/daml/ledger/api/v2/admin/user_management_service.js";
import { GetLedgerApiVersionResponse } from "./generated/canton/com/daml/ledger/api/v2/version_service.js";
import {
    GetPackageContentsResponse as ProtobufGetParticipantPackageContentsResponse,
    GetPackageReferencesResponse as ProtobufGetParticipantPackageReferencesResponse,
    ListPackagesResponse as ProtobufParticipantListPackagesResponse,
} from "./generated/canton/com/digitalasset/canton/admin/participant/v30/package_service.js";
import { ParticipantStatusResponse as ProtobufParticipantStatusResponse } from "./generated/canton/com/digitalasset/canton/admin/participant/v30/participant_status_service.js";
import {
    ListKeyOwnersResponse as ProtobufListKeyOwnersResponse,
    ListPartiesResponse as ProtobufTopologyListPartiesResponse,
} from "./generated/canton/com/digitalasset/canton/topology/admin/v30/topology_aggregation_service.js";
import {
    ListAllResponse as ProtobufTopologyListAllResponse,
    ListAllV2Response as ProtobufTopologyListAllV2Response,
    ListAvailableStoresResponse as ProtobufListAvailableStoresResponse,
    ListDecentralizedNamespaceDefinitionResponse as ProtobufListDecentralizedNamespaceDefinitionResponse,
    ListLsuAnnouncementResponse as ProtobufListLsuAnnouncementResponse,
    ListLsuSequencerConnectionSuccessorResponse as ProtobufListLsuSequencerConnectionSuccessorResponse,
    ListMediatorSynchronizerStateResponse as ProtobufListMediatorSynchronizerStateResponse,
    ListNamespaceDelegationResponse as ProtobufListNamespaceDelegationResponse,
    ListOwnerToKeyMappingResponse as ProtobufListOwnerToKeyMappingResponse,
    ListParticipantSynchronizerPermissionResponse as ProtobufListParticipantSynchronizerPermissionResponse,
    ListPartyHostingLimitsResponse as ProtobufListPartyHostingLimitsResponse,
    ListPartyToKeyMappingResponse as ProtobufListPartyToKeyMappingResponse,
    ListPartyToParticipantResponse as ProtobufListPartyToParticipantResponse,
    ListSequencerSynchronizerStateResponse as ProtobufListSequencerSynchronizerStateResponse,
    ListSequencingParametersStateResponse as ProtobufListSequencingParametersStateResponse,
    ListSynchronizerParametersStateResponse as ProtobufListSynchronizerParametersStateResponse,
    ListSynchronizerTrustCertificateResponse as ProtobufListSynchronizerTrustCertificateResponse,
    ListVettedPackagesResponse as ProtobufTopologyListVettedPackagesResponse,
} from "./generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.js";
import { ObjectDisposedError } from "../../core/errors/object-disposed-error.js";

export class GrpcTransport implements ITransport {
    private disposed = false;

    public readonly features = {
        supportsCommandSigning: true,
    };

    public constructor(private readonly operations: GrpcOperations) {}

    public async disposeAsync(): Promise<void> {
        if (this.disposed) {
            return;
        }

        this.disposed = true;
        await this.operations.disposeAsync?.();
    }

    public async getLedgerApiVersionAsync(
        _request?: GetLedgerApiVersionRequest,
        options?: RequestOptions,
    ): Promise<SdkGetLedgerApiVersionResponse> {
        this.throwIfDisposed();

        const payload =
            await this.operations.getHealthAsync(options) as GetLedgerApiVersionResponse;

        return new SdkGetLedgerApiVersionResponse({
            version: payload.version ?? "",
            features:
                "features" in payload
                    ? payload.features
                    : undefined,
        });
    }

    public async checkHealthAsync(
        request: HealthCheckRequest,
        options?: RequestOptions,
    ): Promise<HealthCheckResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.checkHealthAsync({
            service: request.service ?? "",
        }, options);

        return mapGrpcHealthCheckResponse(
            payload as { status: number },
        );
    }

    public async allocatePartyAsync(
        request: AllocatePartyRequest,
        options?: RequestOptions,
    ): Promise<SdkAllocatePartyResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.createPartyAsync(
            mapGrpcCreatePartyRequest(request),
            options,
        );

        const response = mapGrpcCreateParty(
            payload as { identifier?: string } | AllocatePartyResponse,
        );

        return new SdkAllocatePartyResponse({
            party: response.party,
        });
    }

    public async listKnownPartiesAsync(
        request: ListKnownPartiesRequest,
        options?: RequestOptions,
    ): Promise<SdkListKnownPartiesResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.listPartiesAsync(
            mapGrpcListPartiesRequest(request),
            options,
        );

        const response = mapGrpcListParties(payload as ListKnownPartiesResponse);

        return new SdkListKnownPartiesResponse({
            partyDetails: [...response.partyDetails],
            nextPageToken: response.nextPageToken,
        });
    }

    public async grantUserRightsAsync(
        request: GrantUserRightsRequest,
        options?: RequestOptions,
    ): Promise<GrantUserRightsResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.grantUserRightsAsync(
            mapGrpcGrantUserRightsRequest(request),
            options,
        );

        return mapGrpcGrantUserRights(
            payload as
                | { rights?: Array<{ type: string; party?: string }> }
                | ProtobufGrantUserRightsResponse,
        );
    }

    public async uploadDarFileAsync(
        request: UploadDarFileRequest,
        options?: RequestOptions,
    ): Promise<SdkUploadDarFileResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.uploadPackageAsync(
            mapGrpcUploadPackageRequest(
                {
                    bytes: request.bytes,
                    format: PackageFormat.dar,
                },
            ),
            options,
        );

        const response = mapGrpcUploadPackage(
            payload as { packageId?: string } | UploadDarFileResponse,
        );

        return new SdkUploadDarFileResponse({
            packageId: response.packageId,
        });
    }

    public async listPackagesAsync(
        request: ListPackagesRequest,
        options?: RequestOptions,
    ): Promise<ListPackagesResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.listPackagesAsync!(
            mapGrpcListPackagesRequest(request),
            options,
        );

        return mapGrpcListPackages(
            payload as Partial<ProtobufListPackagesResponse>,
        );
    }

    public async getPackageAsync(
        request: GetPackageRequest,
        options?: RequestOptions,
    ): Promise<GetPackageResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.getPackageAsync!(
            mapGrpcGetPackageRequest(request),
            options,
        );

        return mapGrpcGetPackage(
            payload as Partial<ProtobufGetPackageResponse>,
        );
    }

    public async getPackageStatusAsync(
        request: GetPackageStatusRequest,
        options?: RequestOptions,
    ): Promise<GetPackageStatusResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.getPackageStatusAsync!(
            mapGrpcGetPackageStatusRequest(request),
            options,
        );

        return mapGrpcGetPackageStatus(
            payload as Partial<ProtobufGetPackageStatusResponse>,
        );
    }

    public async listVettedPackagesAsync(
        request: ListVettedPackagesRequest,
        options?: RequestOptions,
    ): Promise<ListVettedPackagesResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.listVettedPackagesAsync!(
            mapGrpcListVettedPackagesRequest(request),
            options,
        );

        return mapGrpcListVettedPackages(
            payload as Partial<ProtobufListVettedPackagesResponse>,
        );
    }

    public async listParticipantPackagesAsync(
        request: ParticipantListPackagesRequest,
        options?: RequestOptions,
    ): Promise<ParticipantListPackagesResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.listParticipantPackagesAsync!(
            mapGrpcParticipantListPackagesRequest(request),
            options,
        );

        return mapGrpcParticipantListPackages(
            payload as Partial<ProtobufParticipantListPackagesResponse>,
        );
    }

    public async getParticipantPackageContentsAsync(
        request: GetPackageContentsRequest,
        options?: RequestOptions,
    ): Promise<GetPackageContentsResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.getParticipantPackageContentsAsync!(
            mapGrpcGetParticipantPackageContentsRequest(request),
            options,
        );

        return mapGrpcGetParticipantPackageContents(
            payload as Partial<ProtobufGetParticipantPackageContentsResponse>,
        );
    }

    public async getParticipantPackageReferencesAsync(
        request: GetPackageReferencesRequest,
        options?: RequestOptions,
    ): Promise<GetPackageReferencesResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.getParticipantPackageReferencesAsync!(
            mapGrpcGetParticipantPackageReferencesRequest(request),
            options,
        );

        return mapGrpcGetParticipantPackageReferences(
            payload as Partial<ProtobufGetParticipantPackageReferencesResponse>,
        );
    }

    public async getParticipantStatusAsync(
        request: GetParticipantStatusRequest,
        options?: RequestOptions,
    ): Promise<GetParticipantStatusResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.getParticipantStatusAsync!(
            mapGrpcGetParticipantStatusRequest(request),
            options,
        );

        return mapGrpcParticipantStatusResponse(
            payload as Partial<ProtobufParticipantStatusResponse>,
        );
    }

    public async listNamespaceDelegationAsync(
        request: ListNamespaceDelegationRequest,
        options?: RequestOptions,
    ): Promise<ListNamespaceDelegationResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.listNamespaceDelegationAsync!(
            mapGrpcListNamespaceDelegationRequest(request),
            options,
        );

        return mapGrpcListNamespaceDelegationResponse(
            payload as Partial<ProtobufListNamespaceDelegationResponse>,
        );
    }

    public async listDecentralizedNamespaceDefinitionAsync(
        request: ListDecentralizedNamespaceDefinitionRequest,
        options?: RequestOptions,
    ): Promise<ListDecentralizedNamespaceDefinitionResponse> {
        this.throwIfDisposed();

        const payload =
            await this.operations.listDecentralizedNamespaceDefinitionAsync!(
                mapGrpcListDecentralizedNamespaceDefinitionRequest(request),
                options,
            );

        return mapGrpcListDecentralizedNamespaceDefinitionResponse(
            payload as Partial<ProtobufListDecentralizedNamespaceDefinitionResponse>,
        );
    }

    public async listOwnerToKeyMappingAsync(
        request: ListOwnerToKeyMappingRequest,
        options?: RequestOptions,
    ): Promise<ListOwnerToKeyMappingResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.listOwnerToKeyMappingAsync!(
            mapGrpcListOwnerToKeyMappingRequest(request),
            options,
        );

        return mapGrpcListOwnerToKeyMappingResponse(
            payload as Partial<ProtobufListOwnerToKeyMappingResponse>,
        );
    }

    public async listPartyToKeyMappingAsync(
        request: ListPartyToKeyMappingRequest,
        options?: RequestOptions,
    ): Promise<ListPartyToKeyMappingResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.listPartyToKeyMappingAsync!(
            mapGrpcListPartyToKeyMappingRequest(request),
            options,
        );

        return mapGrpcListPartyToKeyMappingResponse(
            payload as Partial<ProtobufListPartyToKeyMappingResponse>,
        );
    }

    public async listSynchronizerTrustCertificateAsync(
        request: ListSynchronizerTrustCertificateRequest,
        options?: RequestOptions,
    ): Promise<ListSynchronizerTrustCertificateResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.listSynchronizerTrustCertificateAsync!(
            mapGrpcListSynchronizerTrustCertificateRequest(request),
            options,
        );

        return mapGrpcListSynchronizerTrustCertificateResponse(
            payload as Partial<ProtobufListSynchronizerTrustCertificateResponse>,
        );
    }

    public async listParticipantSynchronizerPermissionAsync(
        request: ListParticipantSynchronizerPermissionRequest,
        options?: RequestOptions,
    ): Promise<ListParticipantSynchronizerPermissionResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.listParticipantSynchronizerPermissionAsync!(
            mapGrpcListParticipantSynchronizerPermissionRequest(request),
            options,
        );

        return mapGrpcListParticipantSynchronizerPermissionResponse(
            payload as Partial<ProtobufListParticipantSynchronizerPermissionResponse>,
        );
    }

    public async listPartyHostingLimitsAsync(
        request: ListPartyHostingLimitsRequest,
        options?: RequestOptions,
    ): Promise<ListPartyHostingLimitsResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.listPartyHostingLimitsAsync!(
            mapGrpcListPartyHostingLimitsRequest(request),
            options,
        );

        return mapGrpcListPartyHostingLimitsResponse(
            payload as Partial<ProtobufListPartyHostingLimitsResponse>,
        );
    }

    public async topologyListVettedPackagesAsync(
        request: TopologyListVettedPackagesRequest,
        options?: RequestOptions,
    ): Promise<TopologyListVettedPackagesResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.topologyListVettedPackagesAsync!(
            mapGrpcTopologyListVettedPackagesRequest(request),
            options,
        );

        return mapGrpcTopologyListVettedPackagesResponse(
            payload as Partial<ProtobufTopologyListVettedPackagesResponse>,
        );
    }

    public async listPartyToParticipantAsync(
        request: ListPartyToParticipantRequest,
        options?: RequestOptions,
    ): Promise<ListPartyToParticipantResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.listPartyToParticipantAsync!(
            mapGrpcListPartyToParticipantRequest(request),
            options,
        );

        return mapGrpcListPartyToParticipantResponse(
            payload as Partial<ProtobufListPartyToParticipantResponse>,
        );
    }

    public async listSynchronizerParametersStateAsync(
        request: ListSynchronizerParametersStateRequest,
        options?: RequestOptions,
    ): Promise<ListSynchronizerParametersStateResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.listSynchronizerParametersStateAsync!(
            mapGrpcListSynchronizerParametersStateRequest(request),
            options,
        );

        return mapGrpcListSynchronizerParametersStateResponse(
            payload as Partial<ProtobufListSynchronizerParametersStateResponse>,
        );
    }

    public async listSequencingParametersStateAsync(
        request: ListSequencingParametersStateRequest,
        options?: RequestOptions,
    ): Promise<ListSequencingParametersStateResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.listSequencingParametersStateAsync!(
            mapGrpcListSequencingParametersStateRequest(request),
            options,
        );

        return mapGrpcListSequencingParametersStateResponse(
            payload as Partial<ProtobufListSequencingParametersStateResponse>,
        );
    }

    public async listMediatorSynchronizerStateAsync(
        request: ListMediatorSynchronizerStateRequest,
        options?: RequestOptions,
    ): Promise<ListMediatorSynchronizerStateResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.listMediatorSynchronizerStateAsync!(
            mapGrpcListMediatorSynchronizerStateRequest(request),
            options,
        );

        return mapGrpcListMediatorSynchronizerStateResponse(
            payload as Partial<ProtobufListMediatorSynchronizerStateResponse>,
        );
    }

    public async listSequencerSynchronizerStateAsync(
        request: ListSequencerSynchronizerStateRequest,
        options?: RequestOptions,
    ): Promise<ListSequencerSynchronizerStateResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.listSequencerSynchronizerStateAsync!(
            mapGrpcListSequencerSynchronizerStateRequest(request),
            options,
        );

        return mapGrpcListSequencerSynchronizerStateResponse(
            payload as Partial<ProtobufListSequencerSynchronizerStateResponse>,
        );
    }

    public async listLsuAnnouncementAsync(
        request: ListLsuAnnouncementRequest,
        options?: RequestOptions,
    ): Promise<ListLsuAnnouncementResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.listLsuAnnouncementAsync!(
            mapGrpcListLsuAnnouncementRequest(request),
            options,
        );

        return mapGrpcListLsuAnnouncementResponse(
            payload as Partial<ProtobufListLsuAnnouncementResponse>,
        );
    }

    public async listLsuSequencerConnectionSuccessorAsync(
        request: ListLsuSequencerConnectionSuccessorRequest,
        options?: RequestOptions,
    ): Promise<ListLsuSequencerConnectionSuccessorResponse> {
        this.throwIfDisposed();

        const payload =
            await this.operations.listLsuSequencerConnectionSuccessorAsync!(
                mapGrpcListLsuSequencerConnectionSuccessorRequest(request),
                options,
            );

        return mapGrpcListLsuSequencerConnectionSuccessorResponse(
            payload as Partial<ProtobufListLsuSequencerConnectionSuccessorResponse>,
        );
    }

    public async listAvailableStoresAsync(
        request: ListAvailableStoresRequest,
        options?: RequestOptions,
    ): Promise<ListAvailableStoresResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.listAvailableStoresAsync!(
            mapGrpcListAvailableStoresRequest(request),
            options,
        );

        return mapGrpcListAvailableStoresResponse(
            payload as Partial<ProtobufListAvailableStoresResponse>,
        );
    }

    public async listAllAsync(
        request: ListAllRequest,
        options?: RequestOptions,
    ): Promise<ListAllResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.listAllAsync!(
            mapGrpcListAllRequest(request),
            options,
        );

        return mapGrpcListAllResponse(
            payload as Partial<ProtobufTopologyListAllResponse>,
        );
    }

    public async listAllV2Async(
        request: ListAllV2Request,
        options?: RequestOptions,
    ): Promise<ListAllV2Response> {
        this.throwIfDisposed();

        const payload = await this.operations.listAllV2Async!(
            mapGrpcListAllV2Request(request),
            options,
        );

        return mapGrpcListAllV2Response(
            payload as Partial<ProtobufTopologyListAllV2Response>,
        );
    }

    public async topologyListPartiesAsync(
        request: TopologyListPartiesRequest,
        options?: RequestOptions,
    ): Promise<TopologyListPartiesResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.topologyListPartiesAsync!(
            mapGrpcTopologyListPartiesRequest(request),
            options,
        );

        return mapGrpcTopologyListPartiesResponse(
            payload as Partial<ProtobufTopologyListPartiesResponse>,
        );
    }

    public async listKeyOwnersAsync(
        request: ListKeyOwnersRequest,
        options?: RequestOptions,
    ): Promise<ListKeyOwnersResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.listKeyOwnersAsync!(
            mapGrpcListKeyOwnersRequest(request),
            options,
        );

        return mapGrpcListKeyOwnersResponse(
            payload as Partial<ProtobufListKeyOwnersResponse>,
        );
    }

    public async getActiveContractsPageAsync(
        request: GetActiveContractsPageRequest,
        options?: RequestOptions,
    ): Promise<GetActiveContractsPageResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.queryContractsAsync(
            mapGrpcQueryContractsRequest({
                party: request.party,
                templateId: request.templateId,
            }),
            options,
        );

        const response = mapGrpcQueryContracts(payload as { contracts?: unknown[] });

        return new GetActiveContractsPageResponse({
            contracts: response.contracts,
        });
    }

    public async getActiveContractsAsync(
        _request: GetActiveContractsRequest,
        _observer: ContractObserver,
        _options?: RequestOptions,
    ): Promise<void> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "StateService.GetActiveContracts is not supported by gRPC transport yet",
        );
    }

    public async getUpdatesAsync(
        request: GetUpdatesRequest,
        observer: TransactionObserver,
        options?: RequestOptions,
    ): Promise<void> {
        this.throwIfDisposed();

        const payload = await this.operations.streamTransactionsAsync(
            mapGrpcStreamTransactionsRequest({
                party: request.party,
                beginOffset: request.beginOffset,
                endOffset: request.endOffset,
                templateId: request.templateId,
            }),
            options,
        );

        const events = mapGrpcTransactionEvents(
            payload as { events?: unknown[] } | readonly unknown[],
        );

        for (const event of events) {
            await observer.nextAsync(event);
        }
    }

    public async submitCommandAsync(
        request: SubmitCommandRequest,
        signed?: SignCommandResult,
        options?: RequestOptions,
    ): Promise<SubmitCommandResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.submitCommandAsync(
            mapGrpcSubmitCommandRequest(request, signed),
            options,
        );

        return mapGrpcSubmitCommand(
            payload as { commandId?: string; transactionId?: string },
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

export function createDefaultGrpcTransport(
    options: CantonClientOptions,
    endpoint: string,
    grpcChannelSecurity: GrpcChannelSecurity,
): GrpcTransport {
    return new GrpcTransport(
        createGrpcOperations(options, endpoint, grpcChannelSecurity),
    );
}
