import { ITransport } from "../../core/transports/transport.interface.js";
import { RequestOptions } from "../../core/types/request-options.js";
import { CountInFlightRequest } from "../../core/types/requests/count-in-flight-request.js";
import { GetConfigForSlowCounterParticipantsRequest } from "../../core/types/requests/get-config-for-slow-counter-participants-request.js";
import { GetIntervalsBehindForCounterParticipantsRequest } from "../../core/types/requests/get-intervals-behind-for-counter-participants-request.js";
import { InspectCommitmentContractsRequest } from "../../core/types/requests/inspect-commitment-contracts-request.js";
import { LookupReceivedAcsCommitmentsRequest } from "../../core/types/requests/lookup-received-acs-commitments-request.js";
import { LookupSentAcsCommitmentsRequest } from "../../core/types/requests/lookup-sent-acs-commitments-request.js";
import { LookupOffsetByTimeRequest } from "../../core/types/requests/lookup-offset-by-time-request.js";
import { OpenCommitmentRequest } from "../../core/types/requests/open-commitment-request.js";
import { CountInFlightResponse } from "../../core/types/responses/count-in-flight-response.js";
import { GetConfigForSlowCounterParticipantsResponse } from "../../core/types/responses/get-config-for-slow-counter-participants-response.js";
import { GetIntervalsBehindForCounterParticipantsResponse } from "../../core/types/responses/get-intervals-behind-for-counter-participants-response.js";
import { InspectCommitmentContractsResponse } from "../../core/types/responses/inspect-commitment-contracts-response.js";
import { LookupReceivedAcsCommitmentsResponse } from "../../core/types/responses/lookup-received-acs-commitments-response.js";
import { LookupSentAcsCommitmentsResponse } from "../../core/types/responses/lookup-sent-acs-commitments-response.js";
import { LookupOffsetByTimeResponse } from "../../core/types/responses/lookup-offset-by-time-response.js";
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
