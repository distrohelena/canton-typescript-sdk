import { ITransport } from "../../core/transports/transport.interface.js";
import { RequestOptions } from "../../core/types/request-options.js";
import { GetUpdateByHashRequest } from "../../core/types/requests/get-update-by-hash-request.js";
import { GetUpdateByIdRequest } from "../../core/types/requests/get-update-by-id-request.js";
import { GetUpdateByOffsetRequest } from "../../core/types/requests/get-update-by-offset-request.js";
import { GetUpdatesPageRequest } from "../../core/types/requests/get-updates-page-request.js";
import { GetUpdatesRequest } from "../../core/types/requests/get-updates-request.js";
import { GetUpdateByHashResponse } from "../../core/types/responses/get-update-by-hash-response.js";
import { GetUpdateByIdResponse } from "../../core/types/responses/get-update-by-id-response.js";
import { GetUpdateByOffsetResponse } from "../../core/types/responses/get-update-by-offset-response.js";
import { GetUpdatesPageResponse } from "../../core/types/responses/get-updates-page-response.js";
import { TransactionObserver } from "../events/transaction-observer.interface.js";

export class UpdateServiceClient {
    public constructor(private readonly transport: ITransport) {
        void this.transport;
    }

    /** Reads ledger updates. gRPC-backed; JSON currently rejects it. */
    public getUpdatesAsync(
        request: GetUpdatesRequest,
        observer: TransactionObserver,
        options?: RequestOptions,
    ): Promise<void> {
        return this.transport.getUpdatesAsync(request, observer, options);
    }

    /** Reads one update by offset. Supported on gRPC; JSON rejects it. */
    public getUpdateByOffsetAsync(
        request: GetUpdateByOffsetRequest,
        options?: RequestOptions,
    ): Promise<GetUpdateByOffsetResponse> {
        return this.transport.getUpdateByOffsetAsync(request, options);
    }

    /** Reads one update by update id. Supported on gRPC; JSON rejects it. */
    public getUpdateByIdAsync(
        request: GetUpdateByIdRequest,
        options?: RequestOptions,
    ): Promise<GetUpdateByIdResponse> {
        return this.transport.getUpdateByIdAsync(request, options);
    }

    /** Reads one update by transaction hash. Supported on gRPC; JSON rejects it. */
    public getUpdateByHashAsync(
        request: GetUpdateByHashRequest,
        options?: RequestOptions,
    ): Promise<GetUpdateByHashResponse> {
        return this.transport.getUpdateByHashAsync(request, options);
    }

    /** Reads a page of updates. Supported on gRPC; JSON rejects it. */
    public getUpdatesPageAsync(
        request: GetUpdatesPageRequest,
        options?: RequestOptions,
    ): Promise<GetUpdatesPageResponse> {
        return this.transport.getUpdatesPageAsync(request, options);
    }
}
