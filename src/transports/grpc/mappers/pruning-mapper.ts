import { ParticipantPruningSchedule } from "../../../core/types/participant-pruning-schedule.js";
import { PruningSchedule } from "../../../core/types/pruning-schedule.js";
import { SafeToPruneCommitmentState } from "../../../core/types/safe-to-prune-commitment-state.js";
import { WaitCommitmentsSetup } from "../../../core/types/wait-commitments-setup.js";
import { GetNoWaitCommitmentsFromRequest } from "../../../core/types/requests/get-no-wait-commitments-from-request.js";
import { GetParticipantPruningScheduleRequest } from "../../../core/types/requests/get-participant-pruning-schedule-request.js";
import { GetPruningScheduleRequest } from "../../../core/types/requests/get-pruning-schedule-request.js";
import { GetSafePruningOffsetRequest } from "../../../core/types/requests/get-safe-pruning-offset-request.js";
import { GetNoWaitCommitmentsFromResponse } from "../../../core/types/responses/get-no-wait-commitments-from-response.js";
import { GetParticipantPruningScheduleResponse } from "../../../core/types/responses/get-participant-pruning-schedule-response.js";
import { GetPruningScheduleResponse } from "../../../core/types/responses/get-pruning-schedule-response.js";
import { GetSafePruningOffsetResponse } from "../../../core/types/responses/get-safe-pruning-offset-response.js";
import {
    GetSafePruningOffsetRequest as GrpcGetSafePruningOffsetRequest,
    GetSafePruningOffsetResponse as GrpcGetSafePruningOffsetResponse,
    SafeToPruneCommitmentState as GrpcSafeToPruneCommitmentState,
} from "../generated/canton/com/digitalasset/canton/admin/participant/v30/pruning_service.js";
import {
    GetNoWaitCommitmentsFromRequest as GrpcGetNoWaitCommitmentsFromRequest,
    GetNoWaitCommitmentsFromResponse as GrpcGetNoWaitCommitmentsFromResponse,
    GetParticipantScheduleRequest as GrpcGetParticipantScheduleRequest,
    GetParticipantScheduleResponse as GrpcGetParticipantScheduleResponse,
    GetScheduleRequest as GrpcGetScheduleRequest,
    GetScheduleResponse as GrpcGetScheduleResponse,
    ParticipantPruningSchedule as GrpcParticipantPruningSchedule,
    PruningSchedule as GrpcPruningSchedule,
    WaitCommitmentsSetup as GrpcWaitCommitmentsSetup,
} from "../generated/canton/com/digitalasset/canton/admin/pruning/v30/pruning.js";
import { mapGrpcTimestamp, mapSdkDuration } from "./topology-common-mapper.js";

export function mapGrpcGetSafePruningOffsetRequest(
    request: GetSafePruningOffsetRequest,
): GrpcGetSafePruningOffsetRequest {
    return {
        beforeOrAt: mapGrpcTimestamp(request.beforeOrAt),
        ledgerEnd: request.ledgerEnd,
        counterParticipantsCommitmentsState:
            mapGrpcSafeToPruneCommitmentState(
                request.counterParticipantsCommitmentsState,
            ),
    };
}

export function mapGrpcGetSafePruningOffset(
    payload?: Partial<GrpcGetSafePruningOffsetResponse>,
): GetSafePruningOffsetResponse {
    return new GetSafePruningOffsetResponse({
        hasSafePruningOffset:
            payload?.response?.oneofKind === "safePruningOffset",
        safePruningOffset:
            payload?.response?.oneofKind === "safePruningOffset"
                ? payload.response.safePruningOffset
                : undefined,
    });
}

export function mapGrpcGetPruningScheduleRequest(
    _request: GetPruningScheduleRequest,
): GrpcGetScheduleRequest {
    return {};
}

export function mapGrpcGetPruningSchedule(
    payload?: Partial<GrpcGetScheduleResponse>,
): GetPruningScheduleResponse {
    return new GetPruningScheduleResponse({
        schedule: mapGrpcPruningSchedule(payload?.schedule),
    });
}

export function mapGrpcGetParticipantPruningScheduleRequest(
    _request: GetParticipantPruningScheduleRequest,
): GrpcGetParticipantScheduleRequest {
    return {};
}

export function mapGrpcGetParticipantPruningSchedule(
    payload?: Partial<GrpcGetParticipantScheduleResponse>,
): GetParticipantPruningScheduleResponse {
    return new GetParticipantPruningScheduleResponse({
        schedule: mapGrpcParticipantPruningSchedule(payload?.schedule),
    });
}

export function mapGrpcGetNoWaitCommitmentsFromRequest(
    request: GetNoWaitCommitmentsFromRequest,
): GrpcGetNoWaitCommitmentsFromRequest {
    return {
        synchronizerIds: [...request.synchronizerIds],
        participantUids: [...request.participantUids],
    };
}

export function mapGrpcGetNoWaitCommitmentsFrom(
    payload?: Partial<GrpcGetNoWaitCommitmentsFromResponse>,
): GetNoWaitCommitmentsFromResponse {
    return new GetNoWaitCommitmentsFromResponse({
        ignoredParticipants: (payload?.ignoredParticipants ?? []).map(
            (item) => mapGrpcWaitCommitmentsSetup(item),
        ),
        notIgnoredParticipants: (payload?.notIgnoredParticipants ?? []).map(
            (item) => mapGrpcWaitCommitmentsSetup(item),
        ),
    });
}

function mapGrpcSafeToPruneCommitmentState(
    value?: SafeToPruneCommitmentState,
): GrpcSafeToPruneCommitmentState | undefined {
    switch (value) {
        case SafeToPruneCommitmentState.match:
            return GrpcSafeToPruneCommitmentState.MATCH;
        case SafeToPruneCommitmentState.matchMismatch:
            return GrpcSafeToPruneCommitmentState.MATCH_MISMATCH;
        case SafeToPruneCommitmentState.all:
            return GrpcSafeToPruneCommitmentState.ALL;
        case SafeToPruneCommitmentState.unspecified:
            return GrpcSafeToPruneCommitmentState.UNSPECIFIED;
        default:
            return undefined;
    }
}

function mapGrpcPruningSchedule(
    payload?: Partial<GrpcPruningSchedule>,
): PruningSchedule | undefined {
    if (payload === undefined) {
        return undefined;
    }

    return new PruningSchedule({
        cron: payload.cron,
        maxDuration: mapSdkDuration(payload.maxDuration),
        retention: mapSdkDuration(payload.retention),
    });
}

function mapGrpcParticipantPruningSchedule(
    payload?: Partial<GrpcParticipantPruningSchedule>,
): ParticipantPruningSchedule | undefined {
    if (payload === undefined) {
        return undefined;
    }

    return new ParticipantPruningSchedule({
        schedule: mapGrpcPruningSchedule(payload.schedule),
        pruneInternallyOnly: payload.pruneInternallyOnly,
    });
}

function mapGrpcWaitCommitmentsSetup(
    payload?: Partial<GrpcWaitCommitmentsSetup>,
): WaitCommitmentsSetup {
    return new WaitCommitmentsSetup({
        counterParticipantUid: payload?.counterParticipantUid ?? "",
        synchronizerIds: [...(payload?.synchronizers?.synchronizerIds ?? [])],
    });
}
