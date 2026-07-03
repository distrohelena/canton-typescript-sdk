import { ITransport } from "../../core/transports/transport.interface.js";
import { CreatePartyRequest } from "../../core/types/requests/create-party-request.js";
import { CreatePartyResponse } from "../../core/types/responses/create-party-response.js";

export class PartiesClient {
    public constructor(private readonly transport: ITransport) {
        void this.transport;
    }

    public createAsync(
        request: CreatePartyRequest,
    ): Promise<CreatePartyResponse> {
        return this.transport.createPartyAsync(request);
    }
}
