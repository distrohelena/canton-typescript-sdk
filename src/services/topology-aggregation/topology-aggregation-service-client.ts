import { ITransport } from "../../core/transports/transport.interface.js";
import { RequestOptions } from "../../core/types/request-options.js";
import { ListKeyOwnersRequest } from "../../core/types/requests/list-key-owners-request.js";
import { TopologyListPartiesRequest } from "../../core/types/requests/topology-list-parties-request.js";
import { ListKeyOwnersResponse } from "../../core/types/responses/list-key-owners-response.js";
import { TopologyListPartiesResponse } from "../../core/types/responses/topology-list-parties-response.js";

export class TopologyAggregationServiceClient {
    public constructor(private readonly transport: ITransport) {
        void this.transport;
    }

    /** Lists aggregated party hosting information. Supported on gRPC; JSON rejects it. */
    public listPartiesAsync(
        request: TopologyListPartiesRequest,
        options?: RequestOptions,
    ): Promise<TopologyListPartiesResponse> {
        return this.transport.topologyListPartiesAsync(request, options);
    }

    /** Lists aggregated key owner information. Supported on gRPC; JSON rejects it. */
    public listKeyOwnersAsync(
        request: ListKeyOwnersRequest,
        options?: RequestOptions,
    ): Promise<ListKeyOwnersResponse> {
        return this.transport.listKeyOwnersAsync(request, options);
    }
}
