import { ITransport } from "../../core/transports/transport.interface.js";
import { AllocatePartyRequest } from "../../core/types/requests/allocate-party-request.js";
import { ListKnownPartiesRequest } from "../../core/types/requests/list-known-parties-request.js";
import { AllocatePartyResponse } from "../../core/types/responses/allocate-party-response.js";
import { ListKnownPartiesResponse } from "../../core/types/responses/list-known-parties-response.js";

export class PartyManagementServiceClient {
    public constructor(private readonly transport: ITransport) {
        void this.transport;
    }

    /** Lists known parties. Supported on JSON and gRPC. */
    public listKnownPartiesAsync(
        request: ListKnownPartiesRequest,
    ): Promise<ListKnownPartiesResponse> {
        return this.transport.listKnownPartiesAsync(request);
    }

    /** Allocates a party. Supported on JSON and gRPC. */
    public allocatePartyAsync(
        request: AllocatePartyRequest,
    ): Promise<AllocatePartyResponse> {
        return this.transport.allocatePartyAsync(request);
    }
}
