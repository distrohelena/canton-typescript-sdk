import { ITransport } from "../../core/transports/transport.interface.js";
import { GetActiveContractsPageRequest } from "../../core/types/requests/get-active-contracts-page-request.js";
import { GetActiveContractsRequest } from "../../core/types/requests/get-active-contracts-request.js";
import { GetActiveContractsPageResponse } from "../../core/types/responses/get-active-contracts-page-response.js";
import { ContractObserver } from "../contracts/contract-observer.interface.js";

export class StateServiceClient {
    public constructor(private readonly transport: ITransport) {
        void this.transport;
    }

    /** Reads a page of active contracts. Supported on JSON and gRPC. */
    public getActiveContractsPageAsync(
        request: GetActiveContractsPageRequest,
    ): Promise<GetActiveContractsPageResponse> {
        return this.transport.getActiveContractsPageAsync(request);
    }

    /** Reads active contracts as a stream. JSON-backed; gRPC currently rejects it. */
    public getActiveContractsAsync(
        request: GetActiveContractsRequest,
        observer: ContractObserver,
    ): Promise<void> {
        return this.transport.getActiveContractsAsync(request, observer);
    }
}
