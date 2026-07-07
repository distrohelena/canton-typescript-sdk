import { Completion } from "../../../core/types/completion.js";
import { CompletionStreamResponse } from "../../../core/types/completion-stream-response.js";
import { OffsetCheckpoint } from "../../../core/types/offset-checkpoint.js";
import { GetCompletionsRequest } from "../../../core/types/requests/get-completions-request.js";
import { mapGrpcSynchronizerTime } from "./state-read-mapper.js";
import { CompletionStreamResponse as GrpcCompletionStreamResponse } from "../generated/canton/com/daml/ledger/api/v2/command_completion_service.js";

export function mapGrpcGetCompletionsRequest(
    request: GetCompletionsRequest,
): {
    parties: string[];
    beginExclusive: string;
} {
    return {
        parties: [...request.parties],
        beginExclusive: request.beginExclusive,
    };
}

export function mapGrpcCompletionStreamResponse(
    payload: Partial<GrpcCompletionStreamResponse>,
): CompletionStreamResponse {
    switch (payload.completionResponse?.oneofKind) {
        case "completion":
            return new CompletionStreamResponse({
                completion: mapGrpcCompletion(
                    payload.completionResponse.completion,
                ),
            });
        case "offsetCheckpoint":
            return new CompletionStreamResponse({
                offsetCheckpoint: new OffsetCheckpoint({
                    offset: payload.completionResponse.offsetCheckpoint.offset,
                    synchronizerTimes:
                        payload.completionResponse.offsetCheckpoint.synchronizerTimes.map(
                            mapGrpcSynchronizerTime,
                        ),
                }),
            });
        default:
            return new CompletionStreamResponse({});
    }
}

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
