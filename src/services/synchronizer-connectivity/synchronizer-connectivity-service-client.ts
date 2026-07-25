import { ITransport } from "../../core/transports/transport.interface.js";
import { RequestOptions } from "../../core/types/request-options.js";
import { ListRegisteredSynchronizersRequest } from "../../core/types/requests/list-registered-synchronizers-request.js";
import type {
    GetSynchronizerIdRequest,
    GetSynchronizerIdResponse,
    ListConnectedSynchronizersRequest,
    ListConnectedSynchronizersResponse,
} from "../../transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/synchronizer_connectivity_service.js";
import { ListRegisteredSynchronizersResponse } from "../../core/types/responses/list-registered-synchronizers-response.js";

export class SynchronizerConnectivityServiceClient {
    public constructor(private readonly transport: ITransport) {
        void this.transport;
    }

    /** Lists connected synchronizers. Supported on gRPC; JSON rejects it. */
    public listConnectedSynchronizersAsync(
        request: ListConnectedSynchronizersRequest,
        options?: RequestOptions,
    ): Promise<ListConnectedSynchronizersResponse> {
        return this.transport.listConnectedSynchronizersAsync(request, options);
    }

    /** Reads synchronizer ids for a synchronizer alias. Supported on gRPC; JSON rejects it. */
    public getSynchronizerIdAsync(
        request: GetSynchronizerIdRequest,
        options?: RequestOptions,
    ): Promise<GetSynchronizerIdResponse> {
        return this.transport.getSynchronizerIdAsync(request, options);
    }

    /** Lists registered synchronizers and their connection status. Supported on gRPC; JSON rejects it. */
    public listRegisteredSynchronizersAsync(
        request: ListRegisteredSynchronizersRequest,
        options?: RequestOptions,
    ): Promise<ListRegisteredSynchronizersResponse> {
        return this.transport.listRegisteredSynchronizersAsync(request, options);
    }
}
