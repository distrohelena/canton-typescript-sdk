import { AdminComponentHealthKind } from "../../../core/types/admin-component-health-kind.js";
import { AdminComponentStatus } from "../../../core/types/admin-component-status.js";
import { AdminNodeStatus } from "../../../core/types/admin-node-status.js";
import { AdminNotInitializedExternalInputKind } from "../../../core/types/admin-not-initialized-external-input-kind.js";
import { AdminNotInitializedStatus } from "../../../core/types/admin-not-initialized-status.js";
import { AdminTopologyQueueStatus } from "../../../core/types/admin-topology-queue-status.js";
import {
    ComponentStatus,
    NotInitialized,
    NotInitialized_WaitingForExternalInput,
    Status,
    TopologyQueueStatus,
} from "../generated/canton/com/digitalasset/canton/admin/health/v30/status_service.js";
import { Duration } from "../generated/canton/google/protobuf/duration.js";

export function mapGrpcAdminNodeStatus(
    payload?: Partial<Status>,
): AdminNodeStatus {
    return new AdminNodeStatus({
        uid: payload?.uid ?? "",
        uptime: mapGrpcDuration(payload?.uptime),
        ports: { ...(payload?.ports ?? {}) },
        active: payload?.active ?? false,
        topologyQueues:
            payload?.topologyQueues === undefined
                ? undefined
                : mapGrpcAdminTopologyQueueStatus(payload.topologyQueues),
        components: (payload?.components ?? []).map(
            (component) => mapGrpcAdminComponentStatus(component),
        ),
        version: payload?.version ?? "",
    });
}

export function mapGrpcAdminNotInitializedStatus(
    payload?: Partial<NotInitialized>,
): AdminNotInitializedStatus {
    return new AdminNotInitializedStatus({
        active: payload?.active ?? false,
        waitingForExternalInput: mapGrpcAdminNotInitializedExternalInputKind(
            payload?.waitingForExternalInput,
        ),
        version: payload?.version ?? "",
    });
}

export function mapGrpcAdminTopologyQueueStatus(
    payload: Partial<TopologyQueueStatus>,
): AdminTopologyQueueStatus {
    return new AdminTopologyQueueStatus({
        manager: payload.manager ?? 0,
        dispatcher: payload.dispatcher ?? 0,
        clients: payload.clients ?? 0,
    });
}

export function mapGrpcAdminComponentStatus(
    payload: Partial<ComponentStatus>,
): AdminComponentStatus {
    const statusKind = payload.status?.oneofKind;

    return new AdminComponentStatus({
        name: payload.name ?? "",
        kind: mapGrpcAdminComponentHealthKind(statusKind),
        description: mapGrpcAdminComponentDescription(payload),
    });
}

function mapGrpcAdminComponentHealthKind(
    statusKind: ComponentStatus["status"]["oneofKind"] | undefined,
): AdminComponentHealthKind {
    switch (statusKind) {
        case "ok":
            return AdminComponentHealthKind.ok;
        case "degraded":
            return AdminComponentHealthKind.degraded;
        case "failed":
            return AdminComponentHealthKind.failed;
        case "fatal":
            return AdminComponentHealthKind.fatal;
        default:
            return AdminComponentHealthKind.unknown;
    }
}

function mapGrpcAdminNotInitializedExternalInputKind(
    value?: NotInitialized_WaitingForExternalInput,
): AdminNotInitializedExternalInputKind {
    switch (value) {
        case NotInitialized_WaitingForExternalInput.ID:
            return AdminNotInitializedExternalInputKind.id;
        case NotInitialized_WaitingForExternalInput.NODE_TOPOLOGY:
            return AdminNotInitializedExternalInputKind.nodeTopology;
        case NotInitialized_WaitingForExternalInput.INITIALIZATION:
            return AdminNotInitializedExternalInputKind.initialization;
        case NotInitialized_WaitingForExternalInput.UNSPECIFIED:
        default:
            return AdminNotInitializedExternalInputKind.unspecified;
    }
}

function mapGrpcAdminComponentDescription(
    payload: Partial<ComponentStatus>,
): string | undefined {
    switch (payload.status?.oneofKind) {
        case "ok":
            return payload.status.ok.description;
        case "degraded":
            return payload.status.degraded.description;
        case "failed":
            return payload.status.failed.description;
        case "fatal":
            return payload.status.fatal.description;
        default:
            return undefined;
    }
}

function mapGrpcDuration(
    payload?: Partial<Duration>,
): { seconds: string; nanos: number } | undefined {
    if (payload === undefined || payload.seconds === undefined) {
        return undefined;
    }

    return {
        seconds: payload.seconds,
        nanos: payload.nanos ?? 0,
    };
}
