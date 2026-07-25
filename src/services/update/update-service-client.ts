import { ITransport } from "../../core/transports/transport.interface.js";
import { RequestOptions } from "../../core/types/request-options.js";
import type {
    GetUpdateByHashRequest,
    GetUpdateByIdRequest,
    GetUpdateByOffsetRequest,
    GetUpdateResponse,
    GetUpdatesPageRequest,
    GetUpdatesPageResponse,
    GetUpdatesRequest,
    GetUpdatesResponse,
} from "../../transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js";

export class UpdateServiceClient {
    public constructor(private readonly transport: ITransport) {
        void this.transport;
    }

    /** Reads ledger updates. gRPC-backed; JSON currently rejects it. */
    public getUpdatesAsync(
        request: GetUpdatesRequest,
        options?: RequestOptions,
    ): AsyncIterable<GetUpdatesResponse> {
        return this.getUpdatesLazy(request, options);
    }

    /** Reads one update by offset. Supported on gRPC; JSON rejects it. */
    public getUpdateByOffsetAsync(
        request: GetUpdateByOffsetRequest,
        options?: RequestOptions,
    ): Promise<GetUpdateResponse> {
        return this.transport.getUpdateByOffsetAsync(request, options);
    }

    /** Reads one update by update id. Supported on gRPC; JSON rejects it. */
    public getUpdateByIdAsync(
        request: GetUpdateByIdRequest,
        options?: RequestOptions,
    ): Promise<GetUpdateResponse> {
        return this.transport.getUpdateByIdAsync(request, options);
    }

    /** Reads one update by transaction hash. Supported on gRPC; JSON rejects it. */
    public getUpdateByHashAsync(
        request: GetUpdateByHashRequest,
        options?: RequestOptions,
    ): Promise<GetUpdateResponse> {
        return this.transport.getUpdateByHashAsync(request, options);
    }

    /** Reads a page of updates. Supported on gRPC; JSON rejects it. */
    public getUpdatesPageAsync(
        request: GetUpdatesPageRequest,
        options?: RequestOptions,
    ): Promise<GetUpdatesPageResponse> {
        return this.transport.getUpdatesPageAsync(request, options);
    }

    private async *getUpdatesLazy(
        request: GetUpdatesRequest,
        options?: RequestOptions,
    ): AsyncIterable<GetUpdatesResponse> {
        yield* this.transport.getUpdatesAsync(request, options);
    }
}
