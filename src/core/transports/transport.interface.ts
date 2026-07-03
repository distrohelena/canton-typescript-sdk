import { TransportFeatures } from "./transport-features.interface.js";
import { AllocatePartyRequest } from "../types/requests/allocate-party-request.js";
import { GrantUserRightsRequest } from "../types/requests/grant-user-rights-request.js";
import { GetActiveContractsPageRequest } from "../types/requests/get-active-contracts-page-request.js";
import { GetActiveContractsRequest } from "../types/requests/get-active-contracts-request.js";
import { ListKnownPartiesRequest } from "../types/requests/list-known-parties-request.js";
import { GetLedgerApiVersionRequest } from "../types/requests/get-ledger-api-version-request.js";
import { GetUpdatesRequest } from "../types/requests/get-updates-request.js";
import { UploadDarFileRequest } from "../types/requests/upload-dar-file-request.js";
import { AllocatePartyResponse } from "../types/responses/allocate-party-response.js";
import { GetActiveContractsPageResponse } from "../types/responses/get-active-contracts-page-response.js";
import { GetLedgerApiVersionResponse } from "../types/responses/get-ledger-api-version-response.js";
import { GrantUserRightsResponse } from "../types/responses/grant-user-rights-response.js";
import { ListKnownPartiesResponse } from "../types/responses/list-known-parties-response.js";
import { SubmitCommandResponse } from "../types/responses/submit-command-response.js";
import { UploadDarFileResponse } from "../types/responses/upload-dar-file-response.js";
import { ContractObserver } from "../../services/contracts/contract-observer.interface.js";
import { TransactionObserver } from "../../services/events/transaction-observer.interface.js";
import { SignCommandResult } from "../signing/sign-command-result.js";
import { SubmitCommandRequest } from "../types/requests/submit-command-request.js";

export interface ITransport {
    readonly features: TransportFeatures;

    /** Reads the ledger API version. Supported on JSON and gRPC. */
    getLedgerApiVersionAsync(
        request?: GetLedgerApiVersionRequest,
    ): Promise<GetLedgerApiVersionResponse>;

    /** Allocates a party. Supported on JSON and gRPC. */
    allocatePartyAsync(
        request: AllocatePartyRequest,
    ): Promise<AllocatePartyResponse>;

    /** Lists known parties. Supported on JSON and gRPC. */
    listKnownPartiesAsync(
        request: ListKnownPartiesRequest,
    ): Promise<ListKnownPartiesResponse>;

    /** Grants user rights. Supported on JSON and gRPC. */
    grantUserRightsAsync(
        request: GrantUserRightsRequest,
    ): Promise<GrantUserRightsResponse>;

    /** Uploads a DAR package. Supported on JSON and gRPC. */
    uploadDarFileAsync(
        request: UploadDarFileRequest,
    ): Promise<UploadDarFileResponse>;

    /** Reads a page of active contracts. Supported on JSON and gRPC. */
    getActiveContractsPageAsync(
        request: GetActiveContractsPageRequest,
    ): Promise<GetActiveContractsPageResponse>;

    /** Reads active contracts as a stream. JSON-backed; gRPC currently rejects it. */
    getActiveContractsAsync(
        request: GetActiveContractsRequest,
        observer: ContractObserver,
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
