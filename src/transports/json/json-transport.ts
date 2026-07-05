import { AllocatePartyRequest } from "../../core/types/requests/allocate-party-request.js";
import { GetActiveContractsPageRequest } from "../../core/types/requests/get-active-contracts-page-request.js";
import { GetActiveContractsRequest } from "../../core/types/requests/get-active-contracts-request.js";
import { GetLedgerApiVersionRequest } from "../../core/types/requests/get-ledger-api-version-request.js";
import { GetPackageContentsRequest } from "../../core/types/requests/get-package-contents-request.js";
import { GetPackageReferencesRequest } from "../../core/types/requests/get-package-references-request.js";
import { GetPackageRequest } from "../../core/types/requests/get-package-request.js";
import { GetPackageStatusRequest } from "../../core/types/requests/get-package-status-request.js";
import { GetParticipantStatusRequest } from "../../core/types/requests/get-participant-status-request.js";
import {
    GrantUserRightsRequest,
    UserRightAssignment,
} from "../../core/types/requests/grant-user-rights-request.js";
import { GetUpdatesRequest } from "../../core/types/requests/get-updates-request.js";
import { HealthCheckRequest } from "../../core/types/requests/health-check-request.js";
import { ListPackagesRequest } from "../../core/types/requests/list-packages-request.js";
import { ListVettedPackagesRequest } from "../../core/types/requests/list-vetted-packages-request.js";
import { ListKnownPartiesRequest } from "../../core/types/requests/list-known-parties-request.js";
import { ParticipantListPackagesRequest } from "../../core/types/requests/participant-list-packages-request.js";
import { SubmitCommandRequest } from "../../core/types/requests/submit-command-request.js";
import { UploadDarFileRequest } from "../../core/types/requests/upload-dar-file-request.js";
import { SignCommandResult } from "../../core/signing/sign-command-result.js";
import { AllocatePartyResponse } from "../../core/types/responses/allocate-party-response.js";
import { GetPackageContentsResponse } from "../../core/types/responses/get-package-contents-response.js";
import { GetPackageReferencesResponse } from "../../core/types/responses/get-package-references-response.js";
import { GetPackageResponse } from "../../core/types/responses/get-package-response.js";
import { GetPackageStatusResponse } from "../../core/types/responses/get-package-status-response.js";
import { GetParticipantStatusResponse } from "../../core/types/responses/get-participant-status-response.js";
import { GetActiveContractsPageResponse } from "../../core/types/responses/get-active-contracts-page-response.js";
import { GetLedgerApiVersionResponse } from "../../core/types/responses/get-ledger-api-version-response.js";
import { GrantUserRightsResponse } from "../../core/types/responses/grant-user-rights-response.js";
import { HealthCheckResponse } from "../../core/types/responses/health-check-response.js";
import { ListPackagesResponse } from "../../core/types/responses/list-packages-response.js";
import { ListKnownPartiesResponse } from "../../core/types/responses/list-known-parties-response.js";
import { ListVettedPackagesResponse } from "../../core/types/responses/list-vetted-packages-response.js";
import { ParticipantListPackagesResponse } from "../../core/types/responses/participant-list-packages-response.js";
import { SubmitCommandResponse } from "../../core/types/responses/submit-command-response.js";
import { UploadDarFileResponse } from "../../core/types/responses/upload-dar-file-response.js";
import { NotSupportedError } from "../../core/errors/not-supported-error.js";
import { ObjectDisposedError } from "../../core/errors/object-disposed-error.js";
import { ITransport } from "../../core/transports/transport.interface.js";
import { RequestOptions } from "../../core/types/request-options.js";
import { mapJsonSubmitCommand } from "./mappers/commands-mapper.js";
import { mapJsonUploadPackage } from "./mappers/packages-mapper.js";
import { mapJsonCreateParty, mapJsonListParties } from "./mappers/parties-mapper.js";
import { mapJsonQueryContracts } from "./mappers/contracts-mapper.js";
import { mapJsonTransactionEvents } from "./mappers/events-mapper.js";
import { mapJsonGrantRights } from "./mappers/users-mapper.js";
import { IJsonHttpClient } from "./json-http-client.js";
import { ContractObserver } from "../../services/contracts/contract-observer.interface.js";
import { TransactionObserver } from "../../services/events/transaction-observer.interface.js";

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

        const payload = await this.httpClient.getAsync("/livez", options);

        return new GetLedgerApiVersionResponse({
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
            "/v1/parties/allocate",
            {
                identifierHint: request.partyIdHint,
                displayName: request.displayName,
            },
            options,
        );

        const response = mapJsonCreateParty(
            payload as {
                result?: { identifier?: string };
                identifier?: string;
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

    public async grantUserRightsAsync(
        request: GrantUserRightsRequest,
        options?: RequestOptions,
    ): Promise<GrantUserRightsResponse> {
        this.throwIfDisposed();

        const payload = await this.httpClient.postAsync(
            "/v1/user/rights/grant",
            {
                userId: request.userId,
                rights: request.rights.map((right: UserRightAssignment) => ({
                    type: right.type,
                    party: right.party,
                })),
            },
            options,
        );

        return mapJsonGrantRights(
            payload as { result?: Array<{ type: string; party?: string }> },
        );
    }

    public async uploadDarFileAsync(
        request: UploadDarFileRequest,
        options?: RequestOptions,
    ): Promise<UploadDarFileResponse> {
        this.throwIfDisposed();

        const payload = await this.httpClient.postAsync(
            "/v1/packages",
            {
                format: "dar",
                bytes: Array.from(request.bytes),
            },
            options,
        );

        const response = mapJsonUploadPackage(
            payload as { result?: { packageId?: string }; packageId?: string },
        );

        return new UploadDarFileResponse({
            packageId: response.packageId,
        });
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

    public async getParticipantStatusAsync(
        _request: GetParticipantStatusRequest,
        _options?: RequestOptions,
    ): Promise<GetParticipantStatusResponse> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "ParticipantStatusService.ParticipantStatus is not supported by json transport",
        );
    }

    public async getActiveContractsPageAsync(
        request: GetActiveContractsPageRequest,
        options?: RequestOptions,
    ): Promise<GetActiveContractsPageResponse> {
        this.throwIfDisposed();

        const payload = await this.httpClient.postAsync(
            "/v1/query",
            {
                templateIds: request.templateId ? [request.templateId] : [],
            },
            options,
        );

        const response = mapJsonQueryContracts(payload as { result?: unknown[] });

        return new GetActiveContractsPageResponse({
            contracts: response.contracts,
        });
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

    public async getUpdatesAsync(
        _request: GetUpdatesRequest,
        _observer: TransactionObserver,
        _options?: RequestOptions,
    ): Promise<void> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "UpdateService.GetUpdates is gRPC-only; JSON supports StateService.getActiveContractsAsync instead",
        );
    }

    public async submitCommandAsync(
        request: SubmitCommandRequest,
        signed?: SignCommandResult,
        options?: RequestOptions,
    ): Promise<SubmitCommandResponse> {
        this.throwIfDisposed();

        if (signed) {
            throw new NotSupportedError(
                "command signing is not supported by json transport",
            );
        }

        const payload = await this.httpClient.postAsync(
            "/v1/create",
            {
                templateId: request.command.templateId,
                payload: request.command.payload,
                applicationId: request.applicationId,
                actAs: request.actAs,
                readAs: request.readAs,
            },
            options,
        );

        return mapJsonSubmitCommand(
            payload as {
                result?: { commandId?: string; transactionId?: string };
                commandId?: string;
                transactionId?: string;
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
