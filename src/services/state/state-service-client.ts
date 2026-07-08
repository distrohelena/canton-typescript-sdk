import { ITransport } from "../../core/transports/transport.interface.js";
import { RequestOptions } from "../../core/types/request-options.js";
import { GetActiveContractsPageRequest } from "../../core/types/requests/get-active-contracts-page-request.js";
import { GetActiveContractsRequest } from "../../core/types/requests/get-active-contracts-request.js";
import { GetConnectedSynchronizersRequest } from "../../core/types/requests/get-connected-synchronizers-request.js";
import { GetLedgerEndRequest } from "../../core/types/requests/get-ledger-end-request.js";
import { GetLatestPrunedOffsetsRequest } from "../../core/types/requests/get-latest-pruned-offsets-request.js";
import { GetActiveContractsPageResponse } from "../../core/types/responses/get-active-contracts-page-response.js";
import { GetConnectedSynchronizersResponse } from "../../core/types/responses/get-connected-synchronizers-response.js";
import { GetLedgerEndResponse } from "../../core/types/responses/get-ledger-end-response.js";
import { GetLatestPrunedOffsetsResponse } from "../../core/types/responses/get-latest-pruned-offsets-response.js";
import { ContractObserver } from "../contracts/contract-observer.interface.js";

export class StateServiceClient {
    public constructor(private readonly transport: ITransport) {
        void this.transport;
    }

    /** Reads a page of active contracts. gRPC supports template and interface filters; JSON supports template queries only. */
    public getActiveContractsPageAsync(
        request: GetActiveContractsPageRequest,
        options?: RequestOptions,
    ): Promise<GetActiveContractsPageResponse> {
        return this.transport.getActiveContractsPageAsync(request, options);
    }

    /** Reads active contracts as a stream. JSON-backed; gRPC currently rejects it. */
    public getActiveContractsAsync(
        request: GetActiveContractsRequest,
        observer: ContractObserver,
        options?: RequestOptions,
    ): Promise<void> {
        return this.transport.getActiveContractsAsync(request, observer, options);
    }

    /** Reads connected synchronizers. Supported on gRPC; JSON rejects it. */
    public getConnectedSynchronizersAsync(
        request: GetConnectedSynchronizersRequest,
        options?: RequestOptions,
    ): Promise<GetConnectedSynchronizersResponse> {
        return this.transport.getConnectedSynchronizersAsync(request, options);
    }

    /** Reads the participant ledger end. Supported on gRPC; JSON rejects it. */
    public getLedgerEndAsync(
        request: GetLedgerEndRequest,
        options?: RequestOptions,
    ): Promise<GetLedgerEndResponse> {
        return this.transport.getLedgerEndAsync(request, options);
    }

    /** Reads the latest participant pruning offsets. Supported on gRPC; JSON rejects it. */
    public getLatestPrunedOffsetsAsync(
        request: GetLatestPrunedOffsetsRequest,
        options?: RequestOptions,
    ): Promise<GetLatestPrunedOffsetsResponse> {
        return this.transport.getLatestPrunedOffsetsAsync(request, options);
    }
}
