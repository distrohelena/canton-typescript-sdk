import { AddPartyAsyncRequest } from "../../../core/types/requests/add-party-async-request.js";
import { TopologyDuration } from "../../../core/types/topology/topology-duration.js";
import { ParticipantPermission } from "../../../core/types/topology/participant-permission.js";
import { AddPartyAsyncResponse } from "../../../core/types/responses/add-party-async-response.js";
import {
    AddPartyAsyncRequest as GrpcAddPartyAsyncRequest,
    AddPartyAsyncResponse as GrpcAddPartyAsyncResponse,
    ParticipantPermission as GrpcParticipantPermission,
} from "../generated/canton/com/digitalasset/canton/admin/participant/v30/party_management_service.js";
import { Duration } from "../generated/canton/google/protobuf/duration.js";
import { mapGrpcTimestamp, mapSdkTimestamp } from "./topology-common-mapper.js";

export function mapGrpcAddPartyAsyncRequest(
    request: AddPartyAsyncRequest,
): GrpcAddPartyAsyncRequest {
    return {
        arguments: {
            partyId: request.arguments.partyId,
            synchronizerId: request.arguments.synchronizerId,
            sourceParticipantUid: request.arguments.sourceParticipantUid,
            topologySerial: request.arguments.topologySerial,
            participantPermission: mapGrpcParticipantPermission(
                request.arguments.participantPermission,
            ),
        },
    };
}

export function mapGrpcAddPartyAsyncResponse(
    payload: Partial<GrpcAddPartyAsyncResponse>,
): AddPartyAsyncResponse {
    return new AddPartyAsyncResponse({
        addPartyRequestId: payload.addPartyRequestId ?? "",
    });
}

function mapGrpcParticipantPermission(
    permission: ParticipantPermission,
): GrpcParticipantPermission {
    switch (permission) {
        case ParticipantPermission.submission:
            return GrpcParticipantPermission.SUBMISSION;
        case ParticipantPermission.confirmation:
            return GrpcParticipantPermission.CONFIRMATION;
        case ParticipantPermission.observation:
            return GrpcParticipantPermission.OBSERVATION;
        default:
            return GrpcParticipantPermission.UNSPECIFIED;
    }
}

function mapGrpcDuration(value?: TopologyDuration): Duration | undefined {
    if (value === undefined) {
        return undefined;
    }

    return {
        seconds: value.seconds,
        nanos: value.nanos,
    };
}
