import { AddPartyAsyncRequest } from "../../../core/types/requests/add-party-async-request.js";
import { ClearPartyOnboardingFlagRequest } from "../../../core/types/requests/clear-party-onboarding-flag-request.js";
import { TopologyDuration } from "../../../core/types/topology/topology-duration.js";
import { ParticipantPermission } from "../../../core/types/topology/participant-permission.js";
import { AddPartyAsyncResponse } from "../../../core/types/responses/add-party-async-response.js";
import { ClearPartyOnboardingFlagResponse } from "../../../core/types/responses/clear-party-onboarding-flag-response.js";
import {
    AddPartyAsyncRequest as GrpcAddPartyAsyncRequest,
    AddPartyAsyncResponse as GrpcAddPartyAsyncResponse,
    ClearPartyOnboardingFlagRequest as GrpcClearPartyOnboardingFlagRequest,
    ClearPartyOnboardingFlagResponse as GrpcClearPartyOnboardingFlagResponse,
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

export function mapGrpcClearPartyOnboardingFlagRequest(
    request: ClearPartyOnboardingFlagRequest,
): GrpcClearPartyOnboardingFlagRequest {
    return {
        partyId: request.partyId,
        synchronizerId: request.synchronizerId,
        beginOffsetExclusive: request.beginOffsetExclusive,
        waitForActivationTimeout: mapGrpcDuration(
            request.waitForActivationTimeout,
        ),
    };
}

export function mapGrpcClearPartyOnboardingFlagResponse(
    payload: Partial<GrpcClearPartyOnboardingFlagResponse>,
): ClearPartyOnboardingFlagResponse {
    return new ClearPartyOnboardingFlagResponse({
        onboarded: payload.onboarded ?? false,
        earliestRetryTimestamp: mapSdkTimestamp(payload.earliestRetryTimestamp),
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
