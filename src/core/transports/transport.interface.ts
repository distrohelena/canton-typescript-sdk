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

export interface ITransport {
    readonly features: TransportFeatures;
    getHealthAsync(): Promise<HealthStatusResponse>;
    createPartyAsync(request: CreatePartyRequest): Promise<CreatePartyResponse>;
    grantUserRightsAsync(
        request: GrantUserRightsRequest,
    ): Promise<GrantUserRightsResponse>;
    uploadPackageAsync(
        request: UploadPackageRequest,
    ): Promise<UploadPackageResponse>;
    queryContractsAsync(
        request: QueryContractsRequest,
    ): Promise<QueryContractsResponse>;
    streamTransactionsAsync(
        request: StreamTransactionsRequest,
        observer: TransactionObserver,
    ): Promise<void>;
    submitCommandAsync(
        request: SubmitCommandRequest,
        signed?: SignCommandResult,
    ): Promise<SubmitCommandResponse>;
}
