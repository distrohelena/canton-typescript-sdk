import { GetEventsByContractIdRequest } from "../../../core/types/requests/get-events-by-contract-id-request.js";
import { GetEventsByContractIdResponse } from "../../../core/types/responses/get-events-by-contract-id-response.js";
import { ContractArchived } from "../../../core/types/contract-archived.js";
import { ContractCreated } from "../../../core/types/contract-created.js";
import {
    GetEventsByContractIdRequest as GrpcGetEventsByContractIdRequest,
    GetEventsByContractIdResponse as GrpcGetEventsByContractIdResponse,
} from "../generated/canton/com/daml/ledger/api/v2/event_query_service.js";

export function mapGrpcGetEventsByContractIdRequest(
    request: GetEventsByContractIdRequest,
): GrpcGetEventsByContractIdRequest {
    return {
        contractId: request.contractId,
        eventFormat: request.eventFormat as never,
    };
}

export function mapGrpcGetEventsByContractId(
    payload: Partial<GrpcGetEventsByContractIdResponse>,
): GetEventsByContractIdResponse {
    return new GetEventsByContractIdResponse({
        created:
            payload.created === undefined
                ? undefined
                : new ContractCreated({
                    createdEvent: payload.created.createdEvent,
                    synchronizerId: payload.created.synchronizerId,
                }),
        archived:
            payload.archived === undefined
                ? undefined
                : new ContractArchived({
                    archivedEvent: payload.archived.archivedEvent,
                    synchronizerId: payload.archived.synchronizerId,
                }),
    });
}
