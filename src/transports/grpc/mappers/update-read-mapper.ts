import { GetUpdateByHashRequest } from "../../../core/types/requests/get-update-by-hash-request.js";
import { GetUpdateByIdRequest } from "../../../core/types/requests/get-update-by-id-request.js";
import { GetUpdateByOffsetRequest } from "../../../core/types/requests/get-update-by-offset-request.js";
import { GetUpdatesPageRequest } from "../../../core/types/requests/get-updates-page-request.js";
import { GetUpdateByHashResponse } from "../../../core/types/responses/get-update-by-hash-response.js";
import { GetUpdateByIdResponse } from "../../../core/types/responses/get-update-by-id-response.js";
import { GetUpdateByOffsetResponse } from "../../../core/types/responses/get-update-by-offset-response.js";
import { GetUpdatesPageResponse } from "../../../core/types/responses/get-updates-page-response.js";
import {
    GetUpdateResponse,
    GetUpdatesPageResponse as GrpcGetUpdatesPageResponse,
} from "../generated/canton/com/daml/ledger/api/v2/update_service.js";

export function mapGrpcGetUpdateByOffsetRequest(
    request: GetUpdateByOffsetRequest,
): {
    offset: string;
    updateFormat?: unknown;
} {
    return {
        offset: request.offset,
        updateFormat: request.updateFormat as never,
    };
}

export function mapGrpcGetUpdateByOffset(
    payload: Partial<GetUpdateResponse>,
): GetUpdateByOffsetResponse {
    return new GetUpdateByOffsetResponse({
        update: mapGrpcUpdatePayload(payload),
    });
}

export function mapGrpcGetUpdateByIdRequest(
    request: GetUpdateByIdRequest,
): {
    updateId: string;
    updateFormat?: unknown;
} {
    return {
        updateId: request.updateId,
        updateFormat: request.updateFormat as never,
    };
}

export function mapGrpcGetUpdateById(
    payload: Partial<GetUpdateResponse>,
): GetUpdateByIdResponse {
    return new GetUpdateByIdResponse({
        update: mapGrpcUpdatePayload(payload),
    });
}

export function mapGrpcGetUpdateByHashRequest(
    request: GetUpdateByHashRequest,
): {
    transactionHash: Uint8Array;
    updateFormat?: unknown;
} {
    return {
        transactionHash: request.transactionHash,
        updateFormat: request.updateFormat as never,
    };
}

export function mapGrpcGetUpdateByHash(
    payload: Partial<GetUpdateResponse>,
): GetUpdateByHashResponse {
    return new GetUpdateByHashResponse({
        update: mapGrpcUpdatePayload(payload),
    });
}

export function mapGrpcGetUpdatesPageRequest(
    request: GetUpdatesPageRequest,
): {
    beginOffsetExclusive?: string;
    endOffsetInclusive?: string;
    maxPageSize?: number;
    updateFormat?: unknown;
    descendingOrder: boolean;
    pageToken?: Uint8Array;
} {
    return {
        beginOffsetExclusive: request.beginOffsetExclusive,
        endOffsetInclusive: request.endOffsetInclusive,
        maxPageSize: request.maxPageSize,
        updateFormat: request.updateFormat as never,
        descendingOrder: request.descendingOrder,
        pageToken: request.pageToken,
    };
}

export function mapGrpcGetUpdatesPage(
    payload: Partial<GrpcGetUpdatesPageResponse>,
): GetUpdatesPageResponse {
    return new GetUpdatesPageResponse({
        updates: (payload.updates ?? []).map(mapGrpcUpdatePayload),
        lowestPageOffsetExclusive: payload.lowestPageOffsetExclusive ?? "0",
        highestPageOffsetInclusive: payload.highestPageOffsetInclusive ?? "0",
        nextPageToken: payload.nextPageToken,
    });
}

function mapGrpcUpdatePayload(payload: Partial<GetUpdateResponse>): unknown {
    switch (payload.update?.oneofKind) {
        case "transaction":
            return payload.update.transaction;
        case "reassignment":
            return payload.update.reassignment;
        case "topologyTransaction":
            return payload.update.topologyTransaction;
        default:
            return undefined;
    }
}
