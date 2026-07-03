import { TransportError } from "../../core/errors/transport-error.js";
import { ITransport } from "../../core/transports/transport.interface.js";
import { CreatePartyRequest } from "../../core/types/requests/create-party-request.js";
import { ListPartiesRequest } from "../../core/types/requests/list-parties-request.js";
import { CreatePartyResponse } from "../../core/types/responses/create-party-response.js";
import { ListPartiesResponse } from "../../core/types/responses/list-parties-response.js";

export class PartyManagementServiceClient {
    public constructor(private readonly transport: ITransport) {
        void this.transport;
    }

    /** Lists known parties. Placeholder until transport alignment lands. */
    public async listKnownPartiesAsync(
        _request: ListPartiesRequest,
    ): Promise<ListPartiesResponse> {
        throw new TransportError(
            "PartyManagementService.ListKnownParties is not available yet",
        );
    }

    /** Allocates a party. Placeholder until transport alignment lands. */
    public async allocatePartyAsync(
        _request: CreatePartyRequest,
    ): Promise<CreatePartyResponse> {
        throw new TransportError(
            "PartyManagementService.AllocateParty is not available yet",
        );
    }
}
