import { ITransport } from "../../core/transports/transport.interface.js";
import { RequestOptions } from "../../core/types/request-options.js";
import { AllocatePartyRequest } from "../../core/types/requests/allocate-party-request.js";
import { GetParticipantIdRequest } from "../../core/types/requests/get-participant-id-request.js";
import { GetPartiesRequest } from "../../core/types/requests/get-parties-request.js";
import { ListKnownPartiesRequest } from "../../core/types/requests/list-known-parties-request.js";
import { AllocatePartyResponse } from "../../core/types/responses/allocate-party-response.js";
import { GetParticipantIdResponse } from "../../core/types/responses/get-participant-id-response.js";
import { GetPartiesResponse } from "../../core/types/responses/get-parties-response.js";
import { ListKnownPartiesResponse } from "../../core/types/responses/list-known-parties-response.js";

export class PartyManagementServiceClient {
    public constructor(private readonly transport: ITransport) {
        void this.transport;
    }

    /** Lists known parties. Supported on JSON and gRPC. */
    public listKnownPartiesAsync(
        request: ListKnownPartiesRequest,
        options?: RequestOptions,
    ): Promise<ListKnownPartiesResponse> {
        return this.transport.listKnownPartiesAsync(request, options);
    }

    /** Reads the host participant identifier. Supported on gRPC; JSON rejects it. */
    public getParticipantIdAsync(
        request: GetParticipantIdRequest,
        options?: RequestOptions,
    ): Promise<GetParticipantIdResponse> {
        return this.transport.getParticipantIdAsync(request, options);
    }

    /** Reads party details for specific parties. Supported on gRPC; JSON rejects it. */
    public getPartiesAsync(
        request: GetPartiesRequest,
        options?: RequestOptions,
    ): Promise<GetPartiesResponse> {
        return this.transport.getPartiesAsync(request, options);
    }

    /** Allocates a party. Supported on JSON and gRPC. */
    public allocatePartyAsync(
        request: AllocatePartyRequest,
        options?: RequestOptions,
    ): Promise<AllocatePartyResponse> {
        return this.transport.allocatePartyAsync(request, options);
    }
}
