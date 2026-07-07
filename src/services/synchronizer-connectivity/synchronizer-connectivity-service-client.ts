import { ITransport } from "../../core/transports/transport.interface.js";
import { RequestOptions } from "../../core/types/request-options.js";
import { GetSynchronizerIdRequest } from "../../core/types/requests/get-synchronizer-id-request.js";
import { ListConnectedSynchronizersRequest } from "../../core/types/requests/list-connected-synchronizers-request.js";
import { ListRegisteredSynchronizersRequest } from "../../core/types/requests/list-registered-synchronizers-request.js";
import { GetSynchronizerIdResponse } from "../../core/types/responses/get-synchronizer-id-response.js";
import { ListConnectedSynchronizersResponse } from "../../core/types/responses/list-connected-synchronizers-response.js";
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
