import { RegisteredSynchronizer } from "../../../core/types/registered-synchronizer.js";
import { RegisteredSynchronizerConnection } from "../../../core/types/registered-synchronizer-connection.js";
import { RegisteredSynchronizerConnectionConfig } from "../../../core/types/registered-synchronizer-connection-config.js";
import { RegisteredSynchronizerConnectionGrpc } from "../../../core/types/registered-synchronizer-connection-grpc.js";
import { RegisteredSynchronizerConnectionPoolDelays } from "../../../core/types/registered-synchronizer-connection-pool-delays.js";
import { RegisteredSynchronizerPredecessor } from "../../../core/types/registered-synchronizer-predecessor.js";
import { RegisteredSynchronizerSequencerConnections } from "../../../core/types/registered-synchronizer-sequencer-connections.js";
import { RegisteredSynchronizerStatus } from "../../../core/types/registered-synchronizer-status.js";
import { RegisteredSynchronizerSubmissionRequestAmplification } from "../../../core/types/registered-synchronizer-submission-request-amplification.js";
import { RegisteredSynchronizerSubscriptionLivenessLimits } from "../../../core/types/registered-synchronizer-subscription-liveness-limits.js";
import { RegisteredSynchronizerTimeProofRequestConfig } from "../../../core/types/registered-synchronizer-time-proof-request-config.js";
import { RegisteredSynchronizerTimeTrackerConfig } from "../../../core/types/registered-synchronizer-time-tracker-config.js";
import { ParticipantConnectedSynchronizer } from "../../../core/types/participant-connected-synchronizer.js";
import { GetSynchronizerIdRequest } from "../../../core/types/requests/get-synchronizer-id-request.js";
import { ListConnectedSynchronizersRequest } from "../../../core/types/requests/list-connected-synchronizers-request.js";
import { ListRegisteredSynchronizersRequest } from "../../../core/types/requests/list-registered-synchronizers-request.js";
import { GetSynchronizerIdResponse } from "../../../core/types/responses/get-synchronizer-id-response.js";
import { ListConnectedSynchronizersResponse } from "../../../core/types/responses/list-connected-synchronizers-response.js";
import { ListRegisteredSynchronizersResponse } from "../../../core/types/responses/list-registered-synchronizers-response.js";
import {
    GetSynchronizerIdRequest as GrpcGetSynchronizerIdRequest,
    GetSynchronizerIdResponse as GrpcGetSynchronizerIdResponse,
    ListConnectedSynchronizersRequest as GrpcListConnectedSynchronizersRequest,
    ListConnectedSynchronizersResponse as GrpcListConnectedSynchronizersResponse,
    ListConnectedSynchronizersResponse_Result,
    ListRegisteredSynchronizersRequest as GrpcListRegisteredSynchronizersRequest,
    ListRegisteredSynchronizersResponse as GrpcListRegisteredSynchronizersResponse,
    ListRegisteredSynchronizersResponse_Result,
    ListRegisteredSynchronizersResponse_Status,
    SynchronizerConnectionConfig,
} from "../generated/canton/com/digitalasset/canton/admin/participant/v30/synchronizer_connectivity_service.js";
import {
    SequencerConnection,
    SequencerConnectionPoolDelays,
    SequencerConnections,
    SubmissionRequestAmplification,
    SubscriptionLivenessLimits,
} from "../generated/canton/com/digitalasset/canton/admin/sequencer/v30/sequencer_connection.js";
import { SynchronizerTimeTrackerConfig, TimeProofRequestConfig } from "../generated/canton/com/digitalasset/canton/admin/time/v30/time_tracker_config.js";
import { SynchronizerPredecessor } from "../generated/canton/com/digitalasset/canton/admin/topology/v30/common.js";
import { mapSdkDuration, mapSdkTimestamp } from "./topology-common-mapper.js";

export function mapGrpcListConnectedSynchronizersRequest(
    _request: ListConnectedSynchronizersRequest,
): GrpcListConnectedSynchronizersRequest {
    return {};
}

export function mapGrpcListConnectedSynchronizers(
    payload?: Partial<GrpcListConnectedSynchronizersResponse>,
): ListConnectedSynchronizersResponse {
    return new ListConnectedSynchronizersResponse({
        connectedSynchronizers: (payload?.connectedSynchronizers ?? []).map(
            (item) => mapGrpcParticipantConnectedSynchronizer(item),
        ),
    });
}

export function mapGrpcGetSynchronizerIdRequest(
    request: GetSynchronizerIdRequest,
): GrpcGetSynchronizerIdRequest {
    return {
        synchronizerAlias: request.synchronizerAlias,
    };
}

export function mapGrpcGetSynchronizerId(
    payload?: Partial<GrpcGetSynchronizerIdResponse>,
): GetSynchronizerIdResponse {
    return new GetSynchronizerIdResponse({
        synchronizerId: payload?.synchronizerId,
        physicalSynchronizerId: payload?.physicalSynchronizerId,
    });
}

export function mapGrpcListRegisteredSynchronizersRequest(
    request: ListRegisteredSynchronizersRequest,
): GrpcListRegisteredSynchronizersRequest {
    return {
        allStatuses: request.allStatuses,
    };
}

export function mapGrpcListRegisteredSynchronizers(
    payload?: Partial<GrpcListRegisteredSynchronizersResponse>,
): ListRegisteredSynchronizersResponse {
    return new ListRegisteredSynchronizersResponse({
        registeredSynchronizers: (payload?.results ?? []).map((item) =>
            mapGrpcRegisteredSynchronizer(item),
        ),
    });
}

function mapGrpcParticipantConnectedSynchronizer(
    payload?: Partial<ListConnectedSynchronizersResponse_Result>,
): ParticipantConnectedSynchronizer {
    return new ParticipantConnectedSynchronizer({
        synchronizerAlias: payload?.synchronizerAlias ?? "",
        synchronizerId: payload?.synchronizerId ?? "",
        physicalSynchronizerId: payload?.physicalSynchronizerId ?? "",
        healthy: payload?.healthy ?? false,
    });
}

function mapGrpcRegisteredSynchronizer(
    payload?: Partial<ListRegisteredSynchronizersResponse_Result>,
): RegisteredSynchronizer {
    return new RegisteredSynchronizer({
        config:
            payload?.config === undefined
                ? undefined
                : mapGrpcRegisteredSynchronizerConnectionConfig(payload.config),
        connected: payload?.connected ?? false,
        physicalSynchronizerId: payload?.physicalSynchronizerId,
        status: mapSdkRegisteredSynchronizerStatus(payload?.status),
        synchronizerPredecessor:
            payload?.synchronizerPredecessor === undefined
                ? undefined
                : mapGrpcRegisteredSynchronizerPredecessor(
                    payload.synchronizerPredecessor,
                ),
    });
}

function mapGrpcRegisteredSynchronizerConnectionConfig(
    payload?: Partial<SynchronizerConnectionConfig>,
): RegisteredSynchronizerConnectionConfig {
    return new RegisteredSynchronizerConnectionConfig({
        synchronizerAlias: payload?.synchronizerAlias ?? "",
        sequencerConnections:
            payload?.sequencerConnections === undefined
                ? undefined
                : mapGrpcRegisteredSynchronizerSequencerConnections(
                    payload.sequencerConnections,
                ),
        manualConnect: payload?.manualConnect ?? false,
        physicalSynchronizerId: payload?.physicalSynchronizerId ?? "",
        priority: payload?.priority ?? 0,
        initialRetryDelay: mapSdkDuration(payload?.initialRetryDelay),
        maxRetryDelay: mapSdkDuration(payload?.maxRetryDelay),
        timeTracker:
            payload?.timeTracker === undefined
                ? undefined
                : mapGrpcRegisteredSynchronizerTimeTrackerConfig(
                    payload.timeTracker,
                ),
        initializeFromTrustedSynchronizer:
            payload?.initializeFromTrustedSynchronizer ?? false,
    });
}

function mapGrpcRegisteredSynchronizerSequencerConnections(
    payload?: Partial<SequencerConnections>,
): RegisteredSynchronizerSequencerConnections {
    return new RegisteredSynchronizerSequencerConnections({
        sequencerConnections: (payload?.sequencerConnections ?? []).map((item) =>
            mapGrpcRegisteredSynchronizerConnection(item),
        ),
        sequencerTrustThreshold: payload?.sequencerTrustThreshold ?? 0,
        submissionRequestAmplification:
            payload?.submissionRequestAmplification === undefined
                ? undefined
                : mapGrpcRegisteredSynchronizerSubmissionRequestAmplification(
                    payload.submissionRequestAmplification,
                ),
        sequencerLivenessMargin: payload?.sequencerLivenessMargin ?? 0,
        sequencerConnectionPoolDelays:
            payload?.sequencerConnectionPoolDelays === undefined
                ? undefined
                : mapGrpcRegisteredSynchronizerConnectionPoolDelays(
                    payload.sequencerConnectionPoolDelays,
                ),
        subscriptionLivenessLimits:
            payload?.subscriptionLivenessLimits === undefined
                ? undefined
                : mapGrpcRegisteredSynchronizerSubscriptionLivenessLimits(
                    payload.subscriptionLivenessLimits,
                ),
    });
}

function mapGrpcRegisteredSynchronizerConnection(
    payload?: Partial<SequencerConnection>,
): RegisteredSynchronizerConnection {
    return new RegisteredSynchronizerConnection({
        alias: payload?.alias ?? "",
        sequencerId: payload?.sequencerId,
        grpc:
            payload?.type?.oneofKind !== "grpc"
                ? undefined
                : new RegisteredSynchronizerConnectionGrpc({
                    connections: payload.type.grpc.connections,
                    transportSecurity: payload.type.grpc.transportSecurity,
                    customTrustCertificates:
                        payload.type.grpc.customTrustCertificates,
                }),
    });
}

function mapGrpcRegisteredSynchronizerSubmissionRequestAmplification(
    payload?: Partial<SubmissionRequestAmplification>,
): RegisteredSynchronizerSubmissionRequestAmplification {
    return new RegisteredSynchronizerSubmissionRequestAmplification({
        factor: payload?.factor ?? 0,
        patience: mapSdkDuration(payload?.patience),
        confirmationResponseFactor: payload?.confirmationResponseFactor,
        confirmationResponsePatience: mapSdkDuration(
            payload?.confirmationResponsePatience,
        ),
    });
}

function mapGrpcRegisteredSynchronizerConnectionPoolDelays(
    payload?: Partial<SequencerConnectionPoolDelays>,
): RegisteredSynchronizerConnectionPoolDelays {
    return new RegisteredSynchronizerConnectionPoolDelays({
        minRestartDelay: mapSdkDuration(payload?.minRestartDelay),
        maxRestartDelay: mapSdkDuration(payload?.maxRestartDelay),
        subscriptionRequestDelay: mapSdkDuration(
            payload?.subscriptionRequestDelay,
        ),
        warnValidationDelay: mapSdkDuration(payload?.warnValidationDelay),
    });
}

function mapGrpcRegisteredSynchronizerSubscriptionLivenessLimits(
    payload?: Partial<SubscriptionLivenessLimits>,
): RegisteredSynchronizerSubscriptionLivenessLimits {
    return new RegisteredSynchronizerSubscriptionLivenessLimits({
        maxTimestampDelta: mapSdkDuration(payload?.maxTimestampDelta),
        maxOrdinalDelta: payload?.maxOrdinalDelta ?? 0,
    });
}

function mapGrpcRegisteredSynchronizerTimeTrackerConfig(
    payload?: Partial<SynchronizerTimeTrackerConfig>,
): RegisteredSynchronizerTimeTrackerConfig {
    return new RegisteredSynchronizerTimeTrackerConfig({
        observationLatency: mapSdkDuration(payload?.observationLatency),
        patienceDuration: mapSdkDuration(payload?.patienceDuration),
        minObservationDuration: mapSdkDuration(payload?.minObservationDuration),
        timeProofRequest:
            payload?.timeProofRequest === undefined
                ? undefined
                : mapGrpcRegisteredSynchronizerTimeProofRequestConfig(
                    payload.timeProofRequest,
                ),
    });
}

function mapGrpcRegisteredSynchronizerTimeProofRequestConfig(
    payload?: Partial<TimeProofRequestConfig>,
): RegisteredSynchronizerTimeProofRequestConfig {
    return new RegisteredSynchronizerTimeProofRequestConfig({
        initialRetryDelay: mapSdkDuration(payload?.initialRetryDelay),
        maxRetryDelay: mapSdkDuration(payload?.maxRetryDelay),
        maxSequencingDelay: mapSdkDuration(payload?.maxSequencingDelay),
    });
}

function mapGrpcRegisteredSynchronizerPredecessor(
    payload?: Partial<SynchronizerPredecessor>,
): RegisteredSynchronizerPredecessor {
    return new RegisteredSynchronizerPredecessor({
        predecessorPhysicalId: payload?.predecessorPhysicalId ?? "",
        upgradeTime: mapSdkTimestamp(payload?.upgradeTime),
        isLateUpgrade: payload?.isLateUpgrade ?? false,
    });
}

function mapSdkRegisteredSynchronizerStatus(
    value?: ListRegisteredSynchronizersResponse_Status,
): RegisteredSynchronizerStatus {
    switch (value) {
        case ListRegisteredSynchronizersResponse_Status.ACTIVE:
            return RegisteredSynchronizerStatus.active;
        case ListRegisteredSynchronizersResponse_Status.HARD_MIGRATING_SOURCE:
            return RegisteredSynchronizerStatus.hardMigratingSource;
        case ListRegisteredSynchronizersResponse_Status.HARD_MIGRATING_TARGET:
            return RegisteredSynchronizerStatus.hardMigratingTarget;
        case ListRegisteredSynchronizersResponse_Status.LSU_SOURCE:
            return RegisteredSynchronizerStatus.lsuSource;
        case ListRegisteredSynchronizersResponse_Status.LSU_TARGET:
            return RegisteredSynchronizerStatus.lsuTarget;
        case ListRegisteredSynchronizersResponse_Status.INACTIVE:
            return RegisteredSynchronizerStatus.inactive;
        case ListRegisteredSynchronizersResponse_Status.UNSPECIFIED:
        default:
            return RegisteredSynchronizerStatus.unspecified;
    }
}
