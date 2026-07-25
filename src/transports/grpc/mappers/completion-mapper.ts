import { Completion } from "../../../core/types/completion.js";
import { mapGrpcSynchronizerTime } from "./state-read-mapper.js";

export function mapGrpcCompletion(payload: {
    commandId: string;
    status?: unknown;
    updateId: string;
    userId: string;
    actAs: string[];
    submissionId: string;
    deduplicationPeriod?: {
        oneofKind?: string;
        deduplicationOffset?: string;
        deduplicationDuration?: {
            seconds: string;
            nanos: number;
        };
    };
    traceContext?: unknown;
    offset: string;
    synchronizerTime?: {
        synchronizerId?: string;
        recordTime?: {
            seconds: string;
            nanos: number;
        };
    };
    paidTrafficCost: string;
    transactionHash?: Uint8Array;
}): Completion {
    return new Completion({
        commandId: payload.commandId,
        status: payload.status,
        updateId: payload.updateId || undefined,
        userId: payload.userId,
        actAs: payload.actAs,
        submissionId: payload.submissionId || undefined,
        deduplicationOffset:
            payload.deduplicationPeriod?.oneofKind === "deduplicationOffset"
                ? payload.deduplicationPeriod.deduplicationOffset
                : undefined,
        deduplicationDuration:
            payload.deduplicationPeriod?.oneofKind === "deduplicationDuration"
                ? payload.deduplicationPeriod.deduplicationDuration
                : undefined,
        traceContext: payload.traceContext,
        offset: payload.offset,
        synchronizerTime:
            payload.synchronizerTime === undefined
                ? undefined
                : mapGrpcSynchronizerTime(payload.synchronizerTime),
        paidTrafficCost: payload.paidTrafficCost,
        transactionHash: payload.transactionHash,
    });
}
