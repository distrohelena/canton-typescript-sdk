import { ITransport } from "../../core/transports/transport.interface.js";
import { RequestOptions } from "../../core/types/request-options.js";
import { GetNoWaitCommitmentsFromRequest } from "../../core/types/requests/get-no-wait-commitments-from-request.js";
import { GetParticipantPruningScheduleRequest } from "../../core/types/requests/get-participant-pruning-schedule-request.js";
import { GetPruningScheduleRequest } from "../../core/types/requests/get-pruning-schedule-request.js";
import { GetSafePruningOffsetRequest } from "../../core/types/requests/get-safe-pruning-offset-request.js";
import { GetNoWaitCommitmentsFromResponse } from "../../core/types/responses/get-no-wait-commitments-from-response.js";
import { GetParticipantPruningScheduleResponse } from "../../core/types/responses/get-participant-pruning-schedule-response.js";
import { GetPruningScheduleResponse } from "../../core/types/responses/get-pruning-schedule-response.js";
import { GetSafePruningOffsetResponse } from "../../core/types/responses/get-safe-pruning-offset-response.js";

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
