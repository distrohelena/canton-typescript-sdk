import { CounterParticipantInfo } from "../../../core/types/counter-participant-info.js";
import { CommitmentInterval } from "../../../core/types/commitment-interval.js";
import { CommitmentTimeRange } from "../../../core/types/commitment-time-range.js";
import { ReceivedAcsCommitment } from "../../../core/types/received-acs-commitment.js";
import { ReceivedAcsCommitmentPerSynchronizer } from "../../../core/types/received-acs-commitment-per-synchronizer.js";
import { ReceivedAcsCommitmentState } from "../../../core/types/received-acs-commitment-state.js";
import { SentAcsCommitment } from "../../../core/types/sent-acs-commitment.js";
import { SentAcsCommitmentPerSynchronizer } from "../../../core/types/sent-acs-commitment-per-synchronizer.js";
import { SentAcsCommitmentState } from "../../../core/types/sent-acs-commitment-state.js";
import { SlowCounterParticipantSynchronizerConfig } from "../../../core/types/slow-counter-participant-synchronizer-config.js";
import { SynchronizerTimeRange } from "../../../core/types/synchronizer-time-range.js";
import { CountInFlightRequest } from "../../../core/types/requests/count-in-flight-request.js";
import { GetConfigForSlowCounterParticipantsRequest } from "../../../core/types/requests/get-config-for-slow-counter-participants-request.js";
import { GetIntervalsBehindForCounterParticipantsRequest } from "../../../core/types/requests/get-intervals-behind-for-counter-participants-request.js";
import { InspectCommitmentContractsRequest } from "../../../core/types/requests/inspect-commitment-contracts-request.js";
import { LookupReceivedAcsCommitmentsRequest } from "../../../core/types/requests/lookup-received-acs-commitments-request.js";
import { LookupSentAcsCommitmentsRequest } from "../../../core/types/requests/lookup-sent-acs-commitments-request.js";
import { LookupOffsetByTimeRequest } from "../../../core/types/requests/lookup-offset-by-time-request.js";
import { OpenCommitmentRequest } from "../../../core/types/requests/open-commitment-request.js";
import { CountInFlightResponse } from "../../../core/types/responses/count-in-flight-response.js";
import { GetConfigForSlowCounterParticipantsResponse } from "../../../core/types/responses/get-config-for-slow-counter-participants-response.js";
import { GetIntervalsBehindForCounterParticipantsResponse } from "../../../core/types/responses/get-intervals-behind-for-counter-participants-response.js";
import { InspectCommitmentContractsResponse } from "../../../core/types/responses/inspect-commitment-contracts-response.js";
import { LookupReceivedAcsCommitmentsResponse } from "../../../core/types/responses/lookup-received-acs-commitments-response.js";
import { LookupSentAcsCommitmentsResponse } from "../../../core/types/responses/lookup-sent-acs-commitments-response.js";
import { LookupOffsetByTimeResponse } from "../../../core/types/responses/lookup-offset-by-time-response.js";
import { OpenCommitmentResponse } from "../../../core/types/responses/open-commitment-response.js";
import {
    CountInFlightRequest as GrpcCountInFlightRequest,
    CountInFlightResponse as GrpcCountInFlightResponse,
    Interval as GrpcInterval,
    CounterParticipantInfo as GrpcCounterParticipantInfo,
    GetConfigForSlowCounterParticipantsRequest as GrpcGetConfigForSlowCounterParticipantsRequest,
    GetConfigForSlowCounterParticipantsResponse as GrpcGetConfigForSlowCounterParticipantsResponse,
    GetIntervalsBehindForCounterParticipantsRequest as GrpcGetIntervalsBehindForCounterParticipantsRequest,
    GetIntervalsBehindForCounterParticipantsResponse as GrpcGetIntervalsBehindForCounterParticipantsResponse,
    InspectCommitmentContractsRequest as GrpcInspectCommitmentContractsRequest,
    InspectCommitmentContractsResponse as GrpcInspectCommitmentContractsResponse,
    LookupReceivedAcsCommitmentsRequest as GrpcLookupReceivedAcsCommitmentsRequest,
    LookupReceivedAcsCommitmentsResponse as GrpcLookupReceivedAcsCommitmentsResponse,
    LookupOffsetByTimeRequest as GrpcLookupOffsetByTimeRequest,
    LookupOffsetByTimeResponse as GrpcLookupOffsetByTimeResponse,
    LookupSentAcsCommitmentsRequest as GrpcLookupSentAcsCommitmentsRequest,
    LookupSentAcsCommitmentsResponse as GrpcLookupSentAcsCommitmentsResponse,
    OpenCommitmentRequest as GrpcOpenCommitmentRequest,
    OpenCommitmentResponse as GrpcOpenCommitmentResponse,
    ReceivedAcsCommitment as GrpcReceivedAcsCommitment,
    ReceivedAcsCommitmentPerSynchronizer as GrpcReceivedAcsCommitmentPerSynchronizer,
    ReceivedCommitmentState,
    SentAcsCommitment as GrpcSentAcsCommitment,
    SentAcsCommitmentPerSynchronizer as GrpcSentAcsCommitmentPerSynchronizer,
    SentCommitmentState,
    SlowCounterParticipantSynchronizerConfig as GrpcSlowCounterParticipantSynchronizerConfig,
    SynchronizerTimeRange as GrpcSynchronizerTimeRange,
    TimeRange as GrpcTimeRange,
} from "../generated/canton/com/digitalasset/canton/admin/participant/v30/participant_inspection_service.js";
import { mapGrpcTimestamp, mapSdkDuration, mapSdkTimestamp } from "./topology-common-mapper.js";

export function mapGrpcLookupOffsetByTimeRequest(
    request: LookupOffsetByTimeRequest,
): GrpcLookupOffsetByTimeRequest {
    return {
        timestamp: mapGrpcTimestamp(request.timestamp),
    };
}

export function mapGrpcLookupOffsetByTime(
    payload?: Partial<GrpcLookupOffsetByTimeResponse>,
): LookupOffsetByTimeResponse {
    return new LookupOffsetByTimeResponse({
        offset: payload?.offset,
    });
}

export function mapGrpcOpenCommitmentRequest(
    request: OpenCommitmentRequest,
): GrpcOpenCommitmentRequest {
    return {
        commitment: request.commitment,
        physicalSynchronizerId: request.physicalSynchronizerId,
        computedForCounterParticipantUid:
            request.computedForCounterParticipantUid,
        periodEndTick: mapGrpcTimestamp(request.periodEndTick),
    };
}

export function mapGrpcOpenCommitment(
    payload?: Partial<GrpcOpenCommitmentResponse>,
): OpenCommitmentResponse {
    return new OpenCommitmentResponse({
        chunk: payload?.chunk,
    });
}

export function mapGrpcInspectCommitmentContractsRequest(
    request: InspectCommitmentContractsRequest,
): GrpcInspectCommitmentContractsRequest {
    return {
        cids: request.cids.map((item) => new Uint8Array(item)),
        expectedSynchronizerId: request.expectedSynchronizerId,
        timestamp: mapGrpcTimestamp(request.timestamp),
        downloadPayload: request.downloadPayload,
    };
}

export function mapGrpcInspectCommitmentContracts(
    payload?: Partial<GrpcInspectCommitmentContractsResponse>,
): InspectCommitmentContractsResponse {
    return new InspectCommitmentContractsResponse({
        chunk: payload?.chunk,
    });
}

export function mapGrpcCountInFlightRequest(
    request: CountInFlightRequest,
): GrpcCountInFlightRequest {
    return {
        synchronizerId: request.synchronizerId,
    };
}

export function mapGrpcCountInFlight(
    payload?: Partial<GrpcCountInFlightResponse>,
): CountInFlightResponse {
    return new CountInFlightResponse({
        pendingSubmissions: payload?.pendingSubmissions ?? 0,
        pendingTransactions: payload?.pendingTransactions ?? 0,
    });
}

export function mapGrpcGetConfigForSlowCounterParticipantsRequest(
    request: GetConfigForSlowCounterParticipantsRequest,
): GrpcGetConfigForSlowCounterParticipantsRequest {
    return {
        synchronizerIds: [...request.synchronizerIds],
    };
}

export function mapGrpcGetConfigForSlowCounterParticipants(
    payload?: Partial<GrpcGetConfigForSlowCounterParticipantsResponse>,
): GetConfigForSlowCounterParticipantsResponse {
    return new GetConfigForSlowCounterParticipantsResponse({
        configs: (payload?.configs ?? []).map(
            (item) => mapGrpcSlowCounterParticipantSynchronizerConfig(item),
        ),
    });
}

export function mapGrpcGetIntervalsBehindForCounterParticipantsRequest(
    request: GetIntervalsBehindForCounterParticipantsRequest,
): GrpcGetIntervalsBehindForCounterParticipantsRequest {
    return {
        counterParticipantIds: [...request.counterParticipantIds],
        synchronizerIds: [...request.synchronizerIds],
        threshold: request.threshold,
    };
}

export function mapGrpcGetIntervalsBehindForCounterParticipants(
    payload?: Partial<GrpcGetIntervalsBehindForCounterParticipantsResponse>,
): GetIntervalsBehindForCounterParticipantsResponse {
    return new GetIntervalsBehindForCounterParticipantsResponse({
        intervalsBehind: (payload?.intervalsBehind ?? []).map(
            (item) => mapGrpcCounterParticipantInfo(item),
        ),
    });
}

export function mapGrpcLookupSentAcsCommitmentsRequest(
    request: LookupSentAcsCommitmentsRequest,
): GrpcLookupSentAcsCommitmentsRequest {
    return {
        timeRanges: request.timeRanges.map((item) =>
            mapGrpcSynchronizerTimeRange(item),
        ),
        counterParticipantIds: [...request.counterParticipantIds],
        commitmentState: request.commitmentState.map((item) =>
            mapGrpcSentCommitmentState(item),
        ),
        verbose: request.verbose,
    };
}

export function mapGrpcLookupSentAcsCommitments(
    payload?: Partial<GrpcLookupSentAcsCommitmentsResponse>,
): LookupSentAcsCommitmentsResponse {
    return new LookupSentAcsCommitmentsResponse({
        sent: (payload?.sent ?? []).map((item) =>
            mapGrpcSentAcsCommitmentPerSynchronizer(item),
        ),
    });
}

export function mapGrpcLookupReceivedAcsCommitmentsRequest(
    request: LookupReceivedAcsCommitmentsRequest,
): GrpcLookupReceivedAcsCommitmentsRequest {
    return {
        timeRanges: request.timeRanges.map((item) =>
            mapGrpcSynchronizerTimeRange(item),
        ),
        counterParticipantIds: [...request.counterParticipantIds],
        commitmentState: request.commitmentState.map((item) =>
            mapGrpcReceivedCommitmentState(item),
        ),
        verbose: request.verbose,
    };
}

export function mapGrpcLookupReceivedAcsCommitments(
    payload?: Partial<GrpcLookupReceivedAcsCommitmentsResponse>,
): LookupReceivedAcsCommitmentsResponse {
    return new LookupReceivedAcsCommitmentsResponse({
        received: (payload?.received ?? []).map((item) =>
            mapGrpcReceivedAcsCommitmentPerSynchronizer(item),
        ),
    });
}

function mapGrpcSlowCounterParticipantSynchronizerConfig(
    payload?: Partial<GrpcSlowCounterParticipantSynchronizerConfig>,
): SlowCounterParticipantSynchronizerConfig {
    return new SlowCounterParticipantSynchronizerConfig({
        synchronizerIds: [...(payload?.synchronizerIds ?? [])],
        distinguishedParticipantUids: [
            ...(payload?.distinguishedParticipantUids ?? []),
        ],
        thresholdDistinguished: payload?.thresholdDistinguished,
        thresholdDefault: payload?.thresholdDefault,
        participantUidsMetrics: [...(payload?.participantUidsMetrics ?? [])],
    });
}

function mapGrpcCounterParticipantInfo(
    payload?: Partial<GrpcCounterParticipantInfo>,
): CounterParticipantInfo {
    return new CounterParticipantInfo({
        counterParticipantUid: payload?.counterParticipantUid ?? "",
        synchronizerId: payload?.synchronizerId ?? "",
        intervalsBehind: payload?.intervalsBehind ?? "",
        behindSince: mapSdkDuration(payload?.behindSince),
        asOfSequencingTimestamp: mapSdkTimestamp(payload?.asOfSequencingTimestamp),
    });
}

function mapGrpcSynchronizerTimeRange(
    range: SynchronizerTimeRange,
): GrpcSynchronizerTimeRange {
    return {
        synchronizerId: range.synchronizerId,
        interval: mapGrpcTimeRange(range.interval),
    };
}

function mapGrpcTimeRange(
    range?: CommitmentTimeRange,
): GrpcTimeRange | undefined {
    if (range === undefined) {
        return undefined;
    }

    return {
        fromExclusive: mapGrpcTimestamp(range.fromExclusive),
        toInclusive: mapGrpcTimestamp(range.toInclusive),
    };
}

function mapGrpcSentAcsCommitmentPerSynchronizer(
    payload?: Partial<GrpcSentAcsCommitmentPerSynchronizer>,
): SentAcsCommitmentPerSynchronizer {
    return new SentAcsCommitmentPerSynchronizer({
        synchronizerId: payload?.synchronizerId ?? "",
        sent: (payload?.sent ?? []).map((item) => mapGrpcSentAcsCommitment(item)),
    });
}

function mapGrpcSentAcsCommitment(
    payload?: Partial<GrpcSentAcsCommitment>,
): SentAcsCommitment {
    return new SentAcsCommitment({
        interval: mapSdkCommitmentInterval(payload?.interval),
        destCounterParticipantUid: payload?.destCounterParticipantUid ?? "",
        ownCommitment: payload?.ownCommitment,
        receivedCommitment: payload?.receivedCommitment,
        state: mapSdkSentCommitmentState(payload?.state),
    });
}

function mapGrpcReceivedAcsCommitmentPerSynchronizer(
    payload?: Partial<GrpcReceivedAcsCommitmentPerSynchronizer>,
): ReceivedAcsCommitmentPerSynchronizer {
    return new ReceivedAcsCommitmentPerSynchronizer({
        synchronizerId: payload?.synchronizerId ?? "",
        received: (payload?.received ?? []).map((item) =>
            mapGrpcReceivedAcsCommitment(item),
        ),
    });
}

function mapGrpcReceivedAcsCommitment(
    payload?: Partial<GrpcReceivedAcsCommitment>,
): ReceivedAcsCommitment {
    return new ReceivedAcsCommitment({
        interval: mapSdkCommitmentInterval(payload?.interval),
        originCounterParticipantUid: payload?.originCounterParticipantUid ?? "",
        receivedCommitment: payload?.receivedCommitment,
        ownCommitment: payload?.ownCommitment,
        state: mapSdkReceivedCommitmentState(payload?.state),
    });
}

function mapSdkCommitmentInterval(
    payload?: Partial<GrpcInterval>,
): CommitmentInterval | undefined {
    if (payload === undefined) {
        return undefined;
    }

    return new CommitmentInterval({
        startTickExclusive: mapSdkTimestamp(payload.startTickExclusive),
        endTickInclusive: mapSdkTimestamp(payload.endTickInclusive),
    });
}

function mapGrpcSentCommitmentState(
    value: SentAcsCommitmentState,
): SentCommitmentState {
    switch (value) {
        case SentAcsCommitmentState.match:
            return SentCommitmentState.MATCH;
        case SentAcsCommitmentState.mismatch:
            return SentCommitmentState.MISMATCH;
        case SentAcsCommitmentState.notCompared:
            return SentCommitmentState.NOT_COMPARED;
        case SentAcsCommitmentState.unspecified:
        default:
            return SentCommitmentState.UNSPECIFIED;
    }
}

function mapSdkSentCommitmentState(
    value?: SentCommitmentState,
): SentAcsCommitmentState {
    switch (value) {
        case SentCommitmentState.MATCH:
            return SentAcsCommitmentState.match;
        case SentCommitmentState.MISMATCH:
            return SentAcsCommitmentState.mismatch;
        case SentCommitmentState.NOT_COMPARED:
            return SentAcsCommitmentState.notCompared;
        case SentCommitmentState.UNSPECIFIED:
        default:
            return SentAcsCommitmentState.unspecified;
    }
}

function mapGrpcReceivedCommitmentState(
    value: ReceivedAcsCommitmentState,
): ReceivedCommitmentState {
    switch (value) {
        case ReceivedAcsCommitmentState.match:
            return ReceivedCommitmentState.MATCH;
        case ReceivedAcsCommitmentState.mismatch:
            return ReceivedCommitmentState.MISMATCH;
        case ReceivedAcsCommitmentState.buffered:
            return ReceivedCommitmentState.BUFFERED;
        case ReceivedAcsCommitmentState.outstanding:
            return ReceivedCommitmentState.OUTSTANDING;
        case ReceivedAcsCommitmentState.unspecified:
        default:
            return ReceivedCommitmentState.UNSPECIFIED;
    }
}

function mapSdkReceivedCommitmentState(
    value?: ReceivedCommitmentState,
): ReceivedAcsCommitmentState {
    switch (value) {
        case ReceivedCommitmentState.MATCH:
            return ReceivedAcsCommitmentState.match;
        case ReceivedCommitmentState.MISMATCH:
            return ReceivedAcsCommitmentState.mismatch;
        case ReceivedCommitmentState.BUFFERED:
            return ReceivedAcsCommitmentState.buffered;
        case ReceivedCommitmentState.OUTSTANDING:
            return ReceivedAcsCommitmentState.outstanding;
        case ReceivedCommitmentState.UNSPECIFIED:
        default:
            return ReceivedAcsCommitmentState.unspecified;
    }
}
