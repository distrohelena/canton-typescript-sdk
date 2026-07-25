import { ITransport } from "../../core/transports/transport.interface.js";
import { RequestOptions } from "../../core/types/request-options.js";
import { InspectCommitmentContractsRequest } from "../../core/types/requests/inspect-commitment-contracts-request.js";
import { OpenCommitmentRequest } from "../../core/types/requests/open-commitment-request.js";
import { InspectCommitmentContractsResponse } from "../../core/types/responses/inspect-commitment-contracts-response.js";
import type {
    CountInFlightRequest,
    CountInFlightResponse,
    GetConfigForSlowCounterParticipantsRequest,
    GetConfigForSlowCounterParticipantsResponse,
    GetIntervalsBehindForCounterParticipantsRequest,
    GetIntervalsBehindForCounterParticipantsResponse,
    LookupOffsetByTimeRequest,
    LookupOffsetByTimeResponse,
    LookupReceivedAcsCommitmentsRequest,
    LookupReceivedAcsCommitmentsResponse,
    LookupSentAcsCommitmentsRequest,
    LookupSentAcsCommitmentsResponse,
} from "../../transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/participant_inspection_service.js";
import { OpenCommitmentResponse } from "../../core/types/responses/open-commitment-response.js";
import { CommitmentChunkObserver } from "./commitment-chunk-observer.interface.js";

export class ParticipantInspectionServiceClient {
    public constructor(private readonly transport: ITransport) {
        void this.transport;
    }

    /** Reads the participant ledger offset for a timestamp. Supported on gRPC; JSON rejects it. */
    public lookupOffsetByTimeAsync(
        request: LookupOffsetByTimeRequest,
        options?: RequestOptions,
    ): Promise<LookupOffsetByTimeResponse> {
        return this.transport.lookupOffsetByTimeAsync(request, options);
    }

    /** Reads participant in-flight submission and transaction counts. Supported on gRPC; JSON rejects it. */
    public countInFlightAsync(
        request: CountInFlightRequest,
        options?: RequestOptions,
    ): Promise<CountInFlightResponse> {
        return this.transport.countInFlightAsync(request, options);
    }

    /** Reads slow counter-participant monitoring config. Supported on gRPC; JSON rejects it. */
    public getConfigForSlowCounterParticipantsAsync(
        request: GetConfigForSlowCounterParticipantsRequest,
        options?: RequestOptions,
    ): Promise<GetConfigForSlowCounterParticipantsResponse> {
        return this.transport.getConfigForSlowCounterParticipantsAsync(
            request,
            options,
        );
    }

    /** Reads counter-participant lag information. Supported on gRPC; JSON rejects it. */
    public getIntervalsBehindForCounterParticipantsAsync(
        request: GetIntervalsBehindForCounterParticipantsRequest,
        options?: RequestOptions,
    ): Promise<GetIntervalsBehindForCounterParticipantsResponse> {
        return this.transport.getIntervalsBehindForCounterParticipantsAsync(
            request,
            options,
        );
    }

    /** Reads commitments sent to counter-participants. Supported on gRPC; JSON rejects it. */
    public lookupSentAcsCommitmentsAsync(
        request: LookupSentAcsCommitmentsRequest,
        options?: RequestOptions,
    ): Promise<LookupSentAcsCommitmentsResponse> {
        return this.transport.lookupSentAcsCommitmentsAsync(request, options);
    }

    /** Reads commitments received from counter-participants. Supported on gRPC; JSON rejects it. */
    public lookupReceivedAcsCommitmentsAsync(
        request: LookupReceivedAcsCommitmentsRequest,
        options?: RequestOptions,
    ): Promise<LookupReceivedAcsCommitmentsResponse> {
        return this.transport.lookupReceivedAcsCommitmentsAsync(
            request,
            options,
        );
    }

    /** Opens a serialized ACS commitment chunk. Supported on gRPC; JSON rejects it. */
    public openCommitmentAsync(
        request: OpenCommitmentRequest,
        observer: CommitmentChunkObserver<OpenCommitmentResponse>,
        options?: RequestOptions,
    ): Promise<void> {
        return this.transport.openCommitmentAsync(request, observer, options);
    }

    /** Reads commitment contract payload chunks. Supported on gRPC; JSON rejects it. */
    public inspectCommitmentContractsAsync(
        request: InspectCommitmentContractsRequest,
        observer: CommitmentChunkObserver<InspectCommitmentContractsResponse>,
        options?: RequestOptions,
    ): Promise<void> {
        return this.transport.inspectCommitmentContractsAsync(
            request,
            observer,
            options,
        );
    }
}
