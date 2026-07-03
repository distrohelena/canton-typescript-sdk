import { TransportFeatures } from "./transport-features.interface.js";
import { AllocatePartyRequest } from "../types/requests/allocate-party-request.js";
import { GrantUserRightsRequest } from "../types/requests/grant-user-rights-request.js";
import { GetActiveContractsPageRequest } from "../types/requests/get-active-contracts-page-request.js";
import { GetActiveContractsRequest } from "../types/requests/get-active-contracts-request.js";
import { ListKnownPartiesRequest } from "../types/requests/list-known-parties-request.js";
import { GetLedgerApiVersionRequest } from "../types/requests/get-ledger-api-version-request.js";
import { GetPackageContentsRequest } from "../types/requests/get-package-contents-request.js";
import { GetPackageReferencesRequest } from "../types/requests/get-package-references-request.js";
import { GetPackageRequest } from "../types/requests/get-package-request.js";
import { GetPackageStatusRequest } from "../types/requests/get-package-status-request.js";
import { GetUpdatesRequest } from "../types/requests/get-updates-request.js";
import { HealthCheckRequest } from "../types/requests/health-check-request.js";
import { ListPackagesRequest } from "../types/requests/list-packages-request.js";
import { ListVettedPackagesRequest } from "../types/requests/list-vetted-packages-request.js";
import { UploadDarFileRequest } from "../types/requests/upload-dar-file-request.js";
import { ParticipantListPackagesRequest } from "../types/requests/participant-list-packages-request.js";
import { GetPackageContentsResponse } from "../types/responses/get-package-contents-response.js";
import { GetPackageReferencesResponse } from "../types/responses/get-package-references-response.js";
import { GetPackageResponse } from "../types/responses/get-package-response.js";
import { GetPackageStatusResponse } from "../types/responses/get-package-status-response.js";
import { AllocatePartyResponse } from "../types/responses/allocate-party-response.js";
import { GetActiveContractsPageResponse } from "../types/responses/get-active-contracts-page-response.js";
import { GetLedgerApiVersionResponse } from "../types/responses/get-ledger-api-version-response.js";
import { GrantUserRightsResponse } from "../types/responses/grant-user-rights-response.js";
import { HealthCheckResponse } from "../types/responses/health-check-response.js";
import { ListPackagesResponse } from "../types/responses/list-packages-response.js";
import { ListKnownPartiesResponse } from "../types/responses/list-known-parties-response.js";
import { ListVettedPackagesResponse } from "../types/responses/list-vetted-packages-response.js";
import { ParticipantListPackagesResponse } from "../types/responses/participant-list-packages-response.js";
import { SubmitCommandResponse } from "../types/responses/submit-command-response.js";
import { UploadDarFileResponse } from "../types/responses/upload-dar-file-response.js";
import { ContractObserver } from "../../services/contracts/contract-observer.interface.js";
import { TransactionObserver } from "../../services/events/transaction-observer.interface.js";
import { SignCommandResult } from "../signing/sign-command-result.js";
import { RequestOptions } from "../types/request-options.js";
import { SubmitCommandRequest } from "../types/requests/submit-command-request.js";

export interface ITransport {
    readonly features: TransportFeatures;

    /** Disposes transport-owned resources. */
    disposeAsync(): Promise<void>;

    /** Reads the ledger API version. Supported on JSON and gRPC. */
    getLedgerApiVersionAsync(
        request?: GetLedgerApiVersionRequest,
        options?: RequestOptions,
    ): Promise<GetLedgerApiVersionResponse>;

    /** Checks gRPC health. Supported on gRPC; JSON rejects it. */
    checkHealthAsync(
        request: HealthCheckRequest,
        options?: RequestOptions,
    ): Promise<HealthCheckResponse>;

    /** Allocates a party. Supported on JSON and gRPC. */
    allocatePartyAsync(
        request: AllocatePartyRequest,
        options?: RequestOptions,
    ): Promise<AllocatePartyResponse>;

    /** Lists known parties. Supported on JSON and gRPC. */
    listKnownPartiesAsync(
        request: ListKnownPartiesRequest,
        options?: RequestOptions,
    ): Promise<ListKnownPartiesResponse>;

    /** Grants user rights. Supported on JSON and gRPC. */
    grantUserRightsAsync(
        request: GrantUserRightsRequest,
        options?: RequestOptions,
    ): Promise<GrantUserRightsResponse>;

    /** Uploads a DAR package. Supported on JSON and gRPC. */
    uploadDarFileAsync(
        request: UploadDarFileRequest,
        options?: RequestOptions,
    ): Promise<UploadDarFileResponse>;

    /** Lists ledger-visible packages. Shared SDK surface; JSON may reject it. */
    listPackagesAsync(
        request: ListPackagesRequest,
        options?: RequestOptions,
    ): Promise<ListPackagesResponse>;

    /** Reads a ledger package archive. Shared SDK surface; JSON may reject it. */
    getPackageAsync(
        request: GetPackageRequest,
        options?: RequestOptions,
    ): Promise<GetPackageResponse>;

    /** Reads ledger package registration status. Shared SDK surface; JSON may reject it. */
    getPackageStatusAsync(
        request: GetPackageStatusRequest,
        options?: RequestOptions,
    ): Promise<GetPackageStatusResponse>;

    /** Lists vetted ledger packages. Shared SDK surface; JSON may reject it. */
    listVettedPackagesAsync(
        request: ListVettedPackagesRequest,
        options?: RequestOptions,
    ): Promise<ListVettedPackagesResponse>;

    /** Lists participant-local packages. Shared SDK surface; JSON may reject it. */
    listParticipantPackagesAsync(
        request: ParticipantListPackagesRequest,
        options?: RequestOptions,
    ): Promise<ParticipantListPackagesResponse>;

    /** Reads participant-local package contents. Shared SDK surface; JSON may reject it. */
    getParticipantPackageContentsAsync(
        request: GetPackageContentsRequest,
        options?: RequestOptions,
    ): Promise<GetPackageContentsResponse>;

    /** Reads participant package references. Shared SDK surface; JSON may reject it. */
    getParticipantPackageReferencesAsync(
        request: GetPackageReferencesRequest,
        options?: RequestOptions,
    ): Promise<GetPackageReferencesResponse>;

    /** Reads a page of active contracts. Supported on JSON and gRPC. */
    getActiveContractsPageAsync(
        request: GetActiveContractsPageRequest,
        options?: RequestOptions,
    ): Promise<GetActiveContractsPageResponse>;

    /** Reads active contracts as a stream. JSON-backed; gRPC currently rejects it. */
    getActiveContractsAsync(
        request: GetActiveContractsRequest,
        observer: ContractObserver,
        options?: RequestOptions,
    ): Promise<void>;

    /** Reads ledger updates. gRPC-backed; JSON currently rejects it. */
    getUpdatesAsync(
        request: GetUpdatesRequest,
        observer: TransactionObserver,
        options?: RequestOptions,
    ): Promise<void>;

    /**
     * Submits a command.
     * Supported on JSON and gRPC. External signing is gRPC-only.
     */
    submitCommandAsync(
        request: SubmitCommandRequest,
        signed?: SignCommandResult,
        options?: RequestOptions,
    ): Promise<SubmitCommandResponse>;
}
