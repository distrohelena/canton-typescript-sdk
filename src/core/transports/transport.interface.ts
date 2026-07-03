import { TransportFeatures } from "./transport-features.interface.js";
import { CreatePartyRequest } from "../types/requests/create-party-request.js";
import { GrantUserRightsRequest } from "../types/requests/grant-user-rights-request.js";
import { QueryContractsRequest } from "../types/requests/query-contracts-request.js";
import { StreamTransactionsRequest } from "../types/requests/stream-transactions-request.js";
import { UploadPackageRequest } from "../types/requests/upload-package-request.js";
import { CreatePartyResponse } from "../types/responses/create-party-response.js";
import { GrantUserRightsResponse } from "../types/responses/grant-user-rights-response.js";
import { HealthStatusResponse } from "../types/responses/health-status-response.js";
import { QueryContractsResponse } from "../types/responses/query-contracts-response.js";
import { SubmitCommandResponse } from "../types/responses/submit-command-response.js";
import { UploadPackageResponse } from "../types/responses/upload-package-response.js";
import { TransactionObserver } from "../../services/events/transaction-observer.interface.js";
import { SignCommandResult } from "../signing/sign-command-result.js";
import { SubmitCommandRequest } from "../types/requests/submit-command-request.js";
import { ListPartiesRequest } from "../types/requests/list-parties-request.js";
import { ListPartiesResponse } from "../types/responses/list-parties-response.js";

export interface ITransport {
    readonly features: TransportFeatures;

    /** Gets participant health. Supported on JSON and gRPC. */
    getHealthAsync(): Promise<HealthStatusResponse>;

    /** Allocates a party. Supported on JSON and gRPC. */
    createPartyAsync(request: CreatePartyRequest): Promise<CreatePartyResponse>;

    /** Lists known parties. Supported on JSON and gRPC. */
    listPartiesAsync(
        request: ListPartiesRequest,
    ): Promise<ListPartiesResponse>;

    /** Grants user rights. Supported on JSON and gRPC. */
    grantUserRightsAsync(
        request: GrantUserRightsRequest,
    ): Promise<GrantUserRightsResponse>;

    /** Uploads a DAR package. Supported on JSON and gRPC. */
    uploadPackageAsync(
        request: UploadPackageRequest,
    ): Promise<UploadPackageResponse>;

    /** Queries contracts. Supported on JSON and gRPC. */
    queryContractsAsync(
        request: QueryContractsRequest,
    ): Promise<QueryContractsResponse>;

    /**
     * Streams ledger update events over gRPC.
     * JSON does not provide equivalent support here; its `/v1/stream/query`
     * endpoint has query-stream semantics, not ledger-update stream semantics.
     */
    streamTransactionsAsync(
        request: StreamTransactionsRequest,
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
