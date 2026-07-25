import { ITransport } from "../../core/transports/transport.interface.js";
import { RequestOptions } from "../../core/types/request-options.js";
import type {
    GetNoWaitCommitmentsFromRequest,
    GetNoWaitCommitmentsFromResponse,
} from "../../transports/grpc/generated/canton/com/digitalasset/canton/admin/pruning/v30/pruning.js";
import type {
    GetParticipantScheduleRequest as GetParticipantPruningScheduleRequest,
    GetParticipantScheduleResponse as GetParticipantPruningScheduleResponse,
} from "../../transports/grpc/generated/canton/com/digitalasset/canton/admin/pruning/v30/pruning.js";
import type {
    GetScheduleRequest as GetPruningScheduleRequest,
    GetScheduleResponse as GetPruningScheduleResponse,
} from "../../transports/grpc/generated/canton/com/digitalasset/canton/admin/pruning/v30/pruning.js";
import type {
    GetSafePruningOffsetRequest,
    GetSafePruningOffsetResponse,
} from "../../transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/pruning_service.js";

export class PruningServiceClient {
    public constructor(private readonly transport: ITransport) {
        void this.transport;
    }

    /** Reads the safe participant pruning offset. Supported on gRPC; JSON rejects it. */
    public getSafePruningOffsetAsync(
        request: GetSafePruningOffsetRequest,
        options?: RequestOptions,
    ): Promise<GetSafePruningOffsetResponse> {
        return this.transport.getSafePruningOffsetAsync(request, options);
    }

    /** Reads the automatic pruning schedule. Supported on gRPC; JSON rejects it. */
    public getScheduleAsync(
        request: GetPruningScheduleRequest,
        options?: RequestOptions,
    ): Promise<GetPruningScheduleResponse> {
        return this.transport.getPruningScheduleAsync(request, options);
    }

    /** Reads the participant-specific automatic pruning schedule. Supported on gRPC; JSON rejects it. */
    public getParticipantScheduleAsync(
        request: GetParticipantPruningScheduleRequest,
        options?: RequestOptions,
    ): Promise<GetParticipantPruningScheduleResponse> {
        return this.transport.getParticipantPruningScheduleAsync(
            request,
            options,
        );
    }

    /** Reads no-wait commitments configuration. Supported on gRPC; JSON rejects it. */
    public getNoWaitCommitmentsFromAsync(
        request: GetNoWaitCommitmentsFromRequest,
        options?: RequestOptions,
    ): Promise<GetNoWaitCommitmentsFromResponse> {
        return this.transport.getNoWaitCommitmentsFromAsync(request, options);
    }
}
