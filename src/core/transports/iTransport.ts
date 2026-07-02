import { TransportFeatures } from "./transportFeatures.js";
import { CreatePartyRequest } from "../types/requests/createPartyRequest.js";
import { GrantUserRightsRequest } from "../types/requests/grantUserRightsRequest.js";
import { QueryContractsRequest } from "../types/requests/queryContractsRequest.js";
import { StreamTransactionsRequest } from "../types/requests/streamTransactionsRequest.js";
import { UploadPackageRequest } from "../types/requests/uploadPackageRequest.js";
import { CreatePartyResponse } from "../types/responses/createPartyResponse.js";
import { GrantUserRightsResponse } from "../types/responses/grantUserRightsResponse.js";
import { HealthStatusResponse } from "../types/responses/healthStatusResponse.js";
import { QueryContractsResponse } from "../types/responses/queryContractsResponse.js";
import { UploadPackageResponse } from "../types/responses/uploadPackageResponse.js";
import { TransactionObserver } from "../../services/events/transactionObserver.js";

export interface ITransport {
  readonly features: TransportFeatures;
  getHealthAsync(): Promise<HealthStatusResponse>;
  createPartyAsync(request: CreatePartyRequest): Promise<CreatePartyResponse>;
  grantUserRightsAsync(
    request: GrantUserRightsRequest
  ): Promise<GrantUserRightsResponse>;
  uploadPackageAsync(request: UploadPackageRequest): Promise<UploadPackageResponse>;
  queryContractsAsync(request: QueryContractsRequest): Promise<QueryContractsResponse>;
  streamTransactionsAsync(
    request: StreamTransactionsRequest,
    observer: TransactionObserver
  ): Promise<void>;
}
