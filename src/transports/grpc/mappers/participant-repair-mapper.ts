import { PendingOperationMetadata } from "../../../core/types/pending-operation-metadata.js";
import { ListPendingOperationsRequest } from "../../../core/types/requests/list-pending-operations-request.js";
import { ListPendingOperationsResponse } from "../../../core/types/responses/list-pending-operations-response.js";
import { ListPendingOperationsRequest as GrpcListPendingOperationsRequest } from "../generated/canton/com/digitalasset/canton/admin/participant/v30/participant_repair_service.js";
import { ListPendingOperationsResponse as GrpcListPendingOperationsResponse } from "../generated/canton/com/digitalasset/canton/admin/participant/v30/participant_repair_service.js";

export function mapGrpcListPendingOperationsRequest(
    request: ListPendingOperationsRequest,
): GrpcListPendingOperationsRequest {
    return {
        operationName: request.operationName,
        filterSynchronizer:
            request.filterSynchronizerId === undefined
            && request.filterPhysicalSynchronizerId === undefined
                ? undefined
                : {
                    kind:
                        request.filterPhysicalSynchronizerId !== undefined
                            ? {
                                oneofKind: "physicalId",
                                physicalId:
                                    request.filterPhysicalSynchronizerId,
                            }
                            : {
                                oneofKind: "id",
                                id: request.filterSynchronizerId ?? "",
                            },
                },
        filterOperationKey: request.filterOperationKey,
    };
}

export function mapGrpcListPendingOperations(
    payload: Partial<GrpcListPendingOperationsResponse>,
): ListPendingOperationsResponse {
    return new ListPendingOperationsResponse({
        pendingOperations: (payload.pendingOperations ?? []).map(
            (item) =>
                new PendingOperationMetadata({
                    operationName: item.operationName,
                    operationKey: item.operationKey,
                    synchronizerId:
                        item.synchronizer?.kind.oneofKind === "id"
                            ? item.synchronizer.kind.id
                            : undefined,
                    physicalSynchronizerId:
                        item.synchronizer?.kind.oneofKind === "physicalId"
                            ? item.synchronizer.kind.physicalId
                            : undefined,
                }),
        ),
    });
}
