import { ParticipantPruningSchedule } from "../../../core/types/participant-pruning-schedule.js";
import { PruningSchedule } from "../../../core/types/pruning-schedule.js";
import { SafeToPruneCommitmentState } from "../../../core/types/safe-to-prune-commitment-state.js";
import { WaitCommitmentsSetup } from "../../../core/types/wait-commitments-setup.js";
import {
    SafeToPruneCommitmentState as GrpcSafeToPruneCommitmentState,
} from "../generated/canton/com/digitalasset/canton/admin/participant/v30/pruning_service.js";
import {
    GetParticipantScheduleRequest as GrpcGetParticipantScheduleRequest,
    GetParticipantScheduleResponse as GrpcGetParticipantScheduleResponse,
    GetScheduleRequest as GrpcGetScheduleRequest,
    GetScheduleResponse as GrpcGetScheduleResponse,
    ParticipantPruningSchedule as GrpcParticipantPruningSchedule,
    PruningSchedule as GrpcPruningSchedule,
    WaitCommitmentsSetup as GrpcWaitCommitmentsSetup,
} from "../generated/canton/com/digitalasset/canton/admin/pruning/v30/pruning.js";
import { mapGrpcTimestamp, mapSdkDuration } from "./topology-common-mapper.js";

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
