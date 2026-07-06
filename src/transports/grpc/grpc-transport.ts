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
import { ListPackagesRequest } from "../../core/types/requests/list-packages-request.js";
import { ListVettedPackagesRequest } from "../../core/types/requests/list-vetted-packages-request.js";
import { ListKnownPartiesRequest } from "../../core/types/requests/list-known-parties-request.js";
import { ParticipantListPackagesRequest } from "../../core/types/requests/participant-list-packages-request.js";
import { SubmitCommandRequest } from "../../core/types/requests/submit-command-request.js";
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
import { ListPackagesResponse } from "../../core/types/responses/list-packages-response.js";
import { ListKnownPartiesResponse as SdkListKnownPartiesResponse } from "../../core/types/responses/list-known-parties-response.js";
import { ListVettedPackagesResponse } from "../../core/types/responses/list-vetted-packages-response.js";
import { ParticipantListPackagesResponse } from "../../core/types/responses/participant-list-packages-response.js";
import { SubmitCommandResponse } from "../../core/types/responses/submit-command-response.js";
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
        _request: any,
        _options?: RequestOptions,
    ): Promise<any> {
        this.throwIfDisposed();
        throw new TransportError("topology namespace delegations are not available yet");
    }

    public async listDecentralizedNamespaceDefinitionAsync(
        _request: any,
        _options?: RequestOptions,
    ): Promise<any> {
        this.throwIfDisposed();
        throw new TransportError("topology decentralized namespaces are not available yet");
    }

    public async listOwnerToKeyMappingAsync(
        _request: any,
        _options?: RequestOptions,
    ): Promise<any> {
        this.throwIfDisposed();
        throw new TransportError("topology owner-to-key mappings are not available yet");
    }

    public async listPartyToKeyMappingAsync(
        _request: any,
        _options?: RequestOptions,
    ): Promise<any> {
        this.throwIfDisposed();
        throw new TransportError("topology party-to-key mappings are not available yet");
    }

    public async listSynchronizerTrustCertificateAsync(
        _request: any,
        _options?: RequestOptions,
    ): Promise<any> {
        this.throwIfDisposed();
        throw new TransportError("topology synchronizer trust certificates are not available yet");
    }

    public async listParticipantSynchronizerPermissionAsync(
        _request: any,
        _options?: RequestOptions,
    ): Promise<any> {
        this.throwIfDisposed();
        throw new TransportError("topology participant synchronizer permissions are not available yet");
    }

    public async listPartyHostingLimitsAsync(
        _request: any,
        _options?: RequestOptions,
    ): Promise<any> {
        this.throwIfDisposed();
        throw new TransportError("topology party hosting limits are not available yet");
    }

    public async topologyListVettedPackagesAsync(
        _request: any,
        _options?: RequestOptions,
    ): Promise<any> {
        this.throwIfDisposed();
        throw new TransportError("topology vetted packages are not available yet");
    }

    public async listPartyToParticipantAsync(
        _request: any,
        _options?: RequestOptions,
    ): Promise<any> {
        this.throwIfDisposed();
        throw new TransportError("topology party-to-participant mappings are not available yet");
    }

    public async listSynchronizerParametersStateAsync(
        _request: any,
        _options?: RequestOptions,
    ): Promise<any> {
        this.throwIfDisposed();
        throw new TransportError("topology synchronizer parameters are not available yet");
    }

    public async listSequencingParametersStateAsync(
        _request: any,
        _options?: RequestOptions,
    ): Promise<any> {
        this.throwIfDisposed();
        throw new TransportError("topology sequencing parameters are not available yet");
    }

    public async listMediatorSynchronizerStateAsync(
        _request: any,
        _options?: RequestOptions,
    ): Promise<any> {
        this.throwIfDisposed();
        throw new TransportError("topology mediator synchronizer state is not available yet");
    }

    public async listSequencerSynchronizerStateAsync(
        _request: any,
        _options?: RequestOptions,
    ): Promise<any> {
        this.throwIfDisposed();
        throw new TransportError("topology sequencer synchronizer state is not available yet");
    }

    public async listLsuAnnouncementAsync(
        _request: any,
        _options?: RequestOptions,
    ): Promise<any> {
        this.throwIfDisposed();
        throw new TransportError("topology lsu announcements are not available yet");
    }

    public async listLsuSequencerConnectionSuccessorAsync(
        _request: any,
        _options?: RequestOptions,
    ): Promise<any> {
        this.throwIfDisposed();
        throw new TransportError("topology lsu sequencer connection successors are not available yet");
    }

    public async listAvailableStoresAsync(
        _request: any,
        _options?: RequestOptions,
    ): Promise<any> {
        this.throwIfDisposed();
        throw new TransportError("topology stores are not available yet");
    }

    public async listAllAsync(
        _request: any,
        _options?: RequestOptions,
    ): Promise<any> {
        this.throwIfDisposed();
        throw new TransportError("topology list-all is not available yet");
    }

    public async listAllV2Async(
        _request: any,
        _options?: RequestOptions,
    ): Promise<any> {
        this.throwIfDisposed();
        throw new TransportError("topology list-all-v2 is not available yet");
    }

    public async topologyListPartiesAsync(
        _request: any,
        _options?: RequestOptions,
    ): Promise<any> {
        this.throwIfDisposed();
        throw new TransportError("topology list parties is not available yet");
    }

    public async listKeyOwnersAsync(
        _request: any,
        _options?: RequestOptions,
    ): Promise<any> {
        this.throwIfDisposed();
        throw new TransportError("topology key owners are not available yet");
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
