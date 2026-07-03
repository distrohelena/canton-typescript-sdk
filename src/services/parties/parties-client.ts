import { ITransport } from "../../core/transports/transport.interface.js";
import { CreatePartyRequest } from "../../core/types/requests/create-party-request.js";
import { ListPartiesRequest } from "../../core/types/requests/list-parties-request.js";
import { CreatePartyResponse } from "../../core/types/responses/create-party-response.js";
import { ListPartiesResponse } from "../../core/types/responses/list-parties-response.js";

export class PartiesClient {
    public constructor(private readonly transport: ITransport) {
        void this.transport;
    }

    public createAsync(
        request: CreatePartyRequest,
    ): Promise<CreatePartyResponse> {
        return this.transport.createPartyAsync(request);
    }

    public listAsync(
        request: ListPartiesRequest,
    ): Promise<ListPartiesResponse> {
        return this.transport.listPartiesAsync(request);
    }
}
