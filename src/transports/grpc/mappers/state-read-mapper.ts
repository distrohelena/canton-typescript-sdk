import { ConnectedSynchronizer } from "../../../core/types/connected-synchronizer.js";
import { SynchronizerTime } from "../../../core/types/synchronizer-time.js";
import { GetConnectedSynchronizersRequest } from "../../../core/types/requests/get-connected-synchronizers-request.js";
import { GetLedgerEndRequest } from "../../../core/types/requests/get-ledger-end-request.js";
import { GetLatestPrunedOffsetsRequest } from "../../../core/types/requests/get-latest-pruned-offsets-request.js";
import { GetConnectedSynchronizersResponse } from "../../../core/types/responses/get-connected-synchronizers-response.js";
import { GetLedgerEndResponse } from "../../../core/types/responses/get-ledger-end-response.js";
import { GetLatestPrunedOffsetsResponse } from "../../../core/types/responses/get-latest-pruned-offsets-response.js";
import { ParticipantPermission } from "../../../core/types/topology/participant-permission.js";
import {
    GetConnectedSynchronizersResponse as GrpcGetConnectedSynchronizersResponse,
    GetLedgerEndResponse as GrpcGetLedgerEndResponse,
    GetLatestPrunedOffsetsResponse as GrpcGetLatestPrunedOffsetsResponse,
} from "../generated/canton/com/daml/ledger/api/v2/state_service.js";
import { Timestamp } from "../generated/canton/google/protobuf/timestamp.js";

export function mapGrpcGetConnectedSynchronizersRequest(
    request: GetConnectedSynchronizersRequest,
): {
    party: string;
    participantId: string;
    identityProviderId: string;
} {
    return {
        party: request.party ?? "",
        participantId: request.participantId ?? "",
        identityProviderId: request.identityProviderId ?? "",
    };
}

export function mapGrpcGetConnectedSynchronizers(
    payload: Partial<GrpcGetConnectedSynchronizersResponse>,
): GetConnectedSynchronizersResponse {
    return new GetConnectedSynchronizersResponse({
        connectedSynchronizers: (payload.connectedSynchronizers ?? []).map(
            item =>
                new ConnectedSynchronizer({
                    synchronizerAlias: item.synchronizerAlias,
                    synchronizerId: item.synchronizerId,
                    permission: mapGrpcParticipantPermission(item.permission),
                }),
        ),
    });
}

export function mapGrpcGetLedgerEndRequest(
    _request: GetLedgerEndRequest,
): Record<string, never> {
    return {};
}

export function mapGrpcGetLedgerEnd(
    payload: Partial<GrpcGetLedgerEndResponse>,
): GetLedgerEndResponse {
    return new GetLedgerEndResponse({
        offset: payload.offset ?? "0",
        synchronizerTimes: (payload.synchronizerTimes ?? []).map(
            mapGrpcSynchronizerTime,
        ),
    });
}

export function mapGrpcGetLatestPrunedOffsetsRequest(
    _request: GetLatestPrunedOffsetsRequest,
): Record<string, never> {
    return {};
}

export function mapGrpcGetLatestPrunedOffsets(
    payload: Partial<GrpcGetLatestPrunedOffsetsResponse>,
): GetLatestPrunedOffsetsResponse {
    return new GetLatestPrunedOffsetsResponse({
        participantPrunedUpToInclusive:
            payload.participantPrunedUpToInclusive ?? "0",
        allDivulgedContractsPrunedUpToInclusive:
            payload.allDivulgedContractsPrunedUpToInclusive ?? "0",
    });
}

export function mapGrpcSynchronizerTime(payload: {
    synchronizerId?: string;
    recordTime?: Timestamp;
}): SynchronizerTime {
    return new SynchronizerTime({
        synchronizerId: payload.synchronizerId ?? "",
        recordTime: mapGrpcTimestamp(payload.recordTime),
    });
}

function mapGrpcParticipantPermission(
    value: number | undefined,
): ParticipantPermission {
    switch (value) {
        case 1:
            return ParticipantPermission.submission;
        case 2:
            return ParticipantPermission.confirmation;
        case 3:
            return ParticipantPermission.observation;
        default:
            return ParticipantPermission.unspecified;
    }
}

function mapGrpcTimestamp(timestamp?: Timestamp): Date | undefined {
    if (timestamp === undefined) {
        return undefined;
    }

    const seconds =
        typeof timestamp.seconds === "string"
            ? Number(timestamp.seconds)
            : timestamp.seconds;

    if (!Number.isFinite(seconds)) {
        return undefined;
    }

    return new Date(
        seconds * 1_000 + Math.floor(timestamp.nanos / 1_000_000),
    );
}
