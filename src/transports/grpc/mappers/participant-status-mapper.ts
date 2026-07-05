import { GetParticipantStatusRequest } from "../../../core/types/requests/get-participant-status-request.js";
import { GetParticipantStatusResponse } from "../../../core/types/responses/get-participant-status-response.js";
import { ConnectedSynchronizerHealth } from "../../../core/types/connected-synchronizer-health.js";
import { ConnectedSynchronizerStatus } from "../../../core/types/connected-synchronizer-status.js";
import { ParticipantNodeStatus } from "../../../core/types/participant-node-status.js";
import {
    ConnectedSynchronizer,
    ConnectedSynchronizer_Health,
    ParticipantStatusResponse,
    ParticipantStatusResponse_ParticipantStatusResponseStatus,
} from "../generated/canton/com/digitalasset/canton/admin/participant/v30/participant_status_service.js";
import {
    mapGrpcAdminNodeStatus,
    mapGrpcAdminNotInitializedStatus,
} from "./admin-status-mapper.js";

export function mapGrpcGetParticipantStatusRequest(
    _request: GetParticipantStatusRequest,
): Record<string, never> {
    return {};
}

export function mapGrpcParticipantStatusResponse(
    payload: Partial<ParticipantStatusResponse>,
): GetParticipantStatusResponse {
    switch (payload.kind?.oneofKind) {
        case "status":
            return new GetParticipantStatusResponse({
                status: mapGrpcParticipantNodeStatus(payload.kind.status),
            });
        case "notInitialized":
            return new GetParticipantStatusResponse({
                notInitialized: mapGrpcAdminNotInitializedStatus(
                    payload.kind.notInitialized,
                ),
            });
        default:
            return new GetParticipantStatusResponse({});
    }
}

function mapGrpcParticipantNodeStatus(
    payload: Partial<ParticipantStatusResponse_ParticipantStatusResponseStatus>,
): ParticipantNodeStatus {
    const commonStatus = mapGrpcAdminNodeStatus(payload.commonStatus);

    return new ParticipantNodeStatus({
        uid: commonStatus.uid,
        uptime: commonStatus.uptime,
        ports: { ...commonStatus.ports },
        active: payload.active ?? commonStatus.active,
        topologyQueues: commonStatus.topologyQueues,
        components: [...commonStatus.components],
        version: commonStatus.version,
        connectedSynchronizers: (payload.connectedSynchronizers ?? []).map(
            (item) => mapGrpcConnectedSynchronizerStatus(item),
        ),
        supportedProtocolVersions: [...(payload.supportedProtocolVersions ?? [])],
    });
}

function mapGrpcConnectedSynchronizerStatus(
    payload: Partial<ConnectedSynchronizer>,
): ConnectedSynchronizerStatus {
    return new ConnectedSynchronizerStatus({
        physicalSynchronizerId: payload.physicalSynchronizerId ?? "",
        health: mapGrpcConnectedSynchronizerHealth(payload.health),
    });
}

function mapGrpcConnectedSynchronizerHealth(
    value?: ConnectedSynchronizer_Health,
): ConnectedSynchronizerHealth {
    switch (value) {
        case ConnectedSynchronizer_Health.HEALTHY:
            return ConnectedSynchronizerHealth.healthy;
        case ConnectedSynchronizer_Health.UNHEALTHY:
            return ConnectedSynchronizerHealth.unhealthy;
        case ConnectedSynchronizer_Health.UNSPECIFIED:
        default:
            return ConnectedSynchronizerHealth.unspecified;
    }
}
