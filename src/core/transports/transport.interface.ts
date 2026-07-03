import { TransportFeatures } from "./transport-features.interface.js";
import { CreatePartyRequest } from "../types/requests/create-party-request.js";
import { AllocatePartyRequest } from "../types/requests/allocate-party-request.js";
import { GrantUserRightsRequest } from "../types/requests/grant-user-rights-request.js";
import { GetActiveContractsPageRequest } from "../types/requests/get-active-contracts-page-request.js";
import { GetActiveContractsRequest } from "../types/requests/get-active-contracts-request.js";
import { ListKnownPartiesRequest } from "../types/requests/list-known-parties-request.js";
import { QueryContractsRequest } from "../types/requests/query-contracts-request.js";
import { GetLedgerApiVersionRequest } from "../types/requests/get-ledger-api-version-request.js";
import { GetUpdatesRequest } from "../types/requests/get-updates-request.js";
import { StreamQueryRequest } from "../types/requests/stream-query-request.js";
import { StreamTransactionsRequest } from "../types/requests/stream-transactions-request.js";
import { UploadDarFileRequest } from "../types/requests/upload-dar-file-request.js";
import { UploadPackageRequest } from "../types/requests/upload-package-request.js";
import { AllocatePartyResponse } from "../types/responses/allocate-party-response.js";
import { CreatePartyResponse } from "../types/responses/create-party-response.js";
import { GetActiveContractsPageResponse } from "../types/responses/get-active-contracts-page-response.js";
import { GetLedgerApiVersionResponse } from "../types/responses/get-ledger-api-version-response.js";
import { GrantUserRightsResponse } from "../types/responses/grant-user-rights-response.js";
import { HealthStatusResponse } from "../types/responses/health-status-response.js";
import { ListKnownPartiesResponse } from "../types/responses/list-known-parties-response.js";
import { QueryContractsResponse } from "../types/responses/query-contracts-response.js";
import { SubmitCommandResponse } from "../types/responses/submit-command-response.js";
import { UploadDarFileResponse } from "../types/responses/upload-dar-file-response.js";
import { UploadPackageResponse } from "../types/responses/upload-package-response.js";
import { ContractObserver } from "../../services/contracts/contract-observer.interface.js";
import { TransactionObserver } from "../../services/events/transaction-observer.interface.js";
import { SignCommandResult } from "../signing/sign-command-result.js";
import { SubmitCommandRequest } from "../types/requests/submit-command-request.js";
import { ListPartiesRequest } from "../types/requests/list-parties-request.js";
import { ListPartiesResponse } from "../types/responses/list-parties-response.js";

export interface ITransport {
    readonly features: TransportFeatures;

    /** Gets participant health. Supported on JSON and gRPC. */
    getHealthAsync(): Promise<HealthStatusResponse>;

    /** Reads the ledger API version. Supported on JSON and gRPC. */
    getLedgerApiVersionAsync(
        request?: GetLedgerApiVersionRequest,
    ): Promise<GetLedgerApiVersionResponse>;

    /** Allocates a party. Supported on JSON and gRPC. */
    createPartyAsync(request: CreatePartyRequest): Promise<CreatePartyResponse>;

    /** Allocates a party. Supported on JSON and gRPC. */
    allocatePartyAsync(
        request: AllocatePartyRequest,
    ): Promise<AllocatePartyResponse>;

    /** Lists known parties. Supported on JSON and gRPC. */
    listPartiesAsync(
        request: ListPartiesRequest,
    ): Promise<ListPartiesResponse>;

    /** Lists known parties. Supported on JSON and gRPC. */
    listKnownPartiesAsync(
        request: ListKnownPartiesRequest,
    ): Promise<ListKnownPartiesResponse>;

    /** Grants user rights. Supported on JSON and gRPC. */
    grantUserRightsAsync(
        request: GrantUserRightsRequest,
    ): Promise<GrantUserRightsResponse>;

    /** Uploads a DAR package. Supported on JSON and gRPC. */
    uploadPackageAsync(
        request: UploadPackageRequest,
    ): Promise<UploadPackageResponse>;

    /** Uploads a DAR file. Supported on JSON and gRPC. */
    uploadDarFileAsync(
        request: UploadDarFileRequest,
    ): Promise<UploadDarFileResponse>;

    /** Queries contracts. Supported on JSON and gRPC. */
    queryContractsAsync(
        request: QueryContractsRequest,
    ): Promise<QueryContractsResponse>;

    /** Reads a page of active contracts. Supported on JSON and gRPC. */
    getActiveContractsPageAsync(
        request: GetActiveContractsPageRequest,
    ): Promise<GetActiveContractsPageResponse>;

    /** Reads active contracts as a stream. JSON-backed; gRPC currently rejects it. */
    getActiveContractsAsync(
        request: GetActiveContractsRequest,
        observer: ContractObserver,
    ): Promise<void>;

    /** Streams contract query results. JSON-only for now; gRPC rejects it. */
    streamQueryAsync(
        request: StreamQueryRequest,
        observer: ContractObserver,
    ): Promise<void>;

    /**
     * Streams ledger update events over gRPC.
     * JSON does not provide equivalent support here; its `/v1/stream/query`
     * endpoint has query-stream semantics, not ledger-update stream semantics.
     */
    streamTransactionsAsync(
        request: StreamTransactionsRequest,
        observer: TransactionObserver,
    ): Promise<void>;

    /** Reads ledger updates. gRPC-backed; JSON currently rejects it. */
    getUpdatesAsync(
        request: GetUpdatesRequest,
        observer: TransactionObserver,
    ): Promise<void>;

    /**
     * Submits a command.
     * Supported on JSON and gRPC. External signing is gRPC-only.
     */
    submitCommandAsync(
        request: SubmitCommandRequest,
        signed?: SignCommandResult,
    ): Promise<SubmitCommandResponse>;
}
