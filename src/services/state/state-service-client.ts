import { ITransport } from "../../core/transports/transport.interface.js";
import { RequestOptions } from "../../core/types/request-options.js";
import { GetActiveContractsRequest } from "../../core/types/requests/get-active-contracts-request.js";
import type {
    GetActiveContractsPageRequest,
    GetActiveContractsPageResponse,
    GetConnectedSynchronizersRequest,
    GetConnectedSynchronizersResponse,
    GetLedgerEndRequest,
    GetLedgerEndResponse,
    GetLatestPrunedOffsetsRequest,
    GetLatestPrunedOffsetsResponse,
} from "../../transports/grpc/generated/canton/com/daml/ledger/api/v2/state_service.js";
import { ContractObserver } from "../contracts/contract-observer.interface.js";

export class StateServiceClient {
    public constructor(private readonly transport: ITransport) {
        void this.transport;
    }

    /** Reads a page of active contracts. Supported on gRPC; JSON rejects it. */
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
