import { TopologyDuration } from "./topology-duration.js";

export enum OnboardingRestriction {
    unspecified = "unspecified",
    unrestrictedOpen = "unrestrictedOpen",
    unrestrictedLocked = "unrestrictedLocked",
    restrictedOpen = "restrictedOpen",
    restrictedLocked = "restrictedLocked",
}

export class TrafficControlParameters {
    public readonly maxBaseTrafficAmount: string;
    public readonly maxBaseTrafficAccumulationDuration?: TopologyDuration;
    public readonly readVsWriteScalingFactor: number;
    public readonly setBalanceRequestSubmissionWindowSize?: TopologyDuration;
    public readonly enforceRateLimiting: boolean;
    public readonly baseEventCost?: string;
    public readonly freeConfirmationResponses: boolean;

    public constructor(init: {
        maxBaseTrafficAmount?: string;
        maxBaseTrafficAccumulationDuration?: TopologyDuration;
        readVsWriteScalingFactor?: number;
        setBalanceRequestSubmissionWindowSize?: TopologyDuration;
        enforceRateLimiting?: boolean;
        baseEventCost?: string;
        freeConfirmationResponses?: boolean;
    } = {}) {
        this.maxBaseTrafficAmount = init.maxBaseTrafficAmount ?? "0";
        this.maxBaseTrafficAccumulationDuration =
            init.maxBaseTrafficAccumulationDuration;
        this.readVsWriteScalingFactor = init.readVsWriteScalingFactor ?? 0;
        this.setBalanceRequestSubmissionWindowSize =
            init.setBalanceRequestSubmissionWindowSize;
        this.enforceRateLimiting = init.enforceRateLimiting ?? false;
        this.baseEventCost = init.baseEventCost;
        this.freeConfirmationResponses =
            init.freeConfirmationResponses ?? false;
    }
}

export class AcsCommitmentsCatchUpConfig {
    public readonly catchupIntervalSkip: number;
    public readonly nrIntervalsToTriggerCatchup: number;

    public constructor(init: {
        catchupIntervalSkip?: number;
        nrIntervalsToTriggerCatchup?: number;
    } = {}) {
        this.catchupIntervalSkip = init.catchupIntervalSkip ?? 0;
        this.nrIntervalsToTriggerCatchup =
            init.nrIntervalsToTriggerCatchup ?? 0;
    }
}

export class DynamicSynchronizerParameters {
    public readonly confirmationResponseTimeout?: TopologyDuration;
    public readonly mediatorReactionTimeout?: TopologyDuration;
    public readonly assignmentExclusivityTimeout?: TopologyDuration;
    public readonly ledgerTimeRecordTimeTolerance?: TopologyDuration;
    public readonly reconciliationInterval?: TopologyDuration;
    public readonly mediatorDeduplicationTimeout?: TopologyDuration;
    public readonly maxRequestSize: number;
    public readonly onboardingRestriction: OnboardingRestriction;
    public readonly participantSynchronizerLimits?: {
        confirmationRequestsMaxRate: number;
    };
    public readonly sequencerAggregateSubmissionTimeout?: TopologyDuration;
    public readonly trafficControl?: TrafficControlParameters;
    public readonly acsCommitmentsCatchup?: AcsCommitmentsCatchUpConfig;
    public readonly preparationTimeRecordTimeTolerance?: TopologyDuration;

    public constructor(init: {
        confirmationResponseTimeout?: TopologyDuration;
        mediatorReactionTimeout?: TopologyDuration;
        assignmentExclusivityTimeout?: TopologyDuration;
        ledgerTimeRecordTimeTolerance?: TopologyDuration;
        reconciliationInterval?: TopologyDuration;
        mediatorDeduplicationTimeout?: TopologyDuration;
        maxRequestSize?: number;
        onboardingRestriction?: OnboardingRestriction;
        participantSynchronizerLimits?: {
            confirmationRequestsMaxRate: number;
        };
        sequencerAggregateSubmissionTimeout?: TopologyDuration;
        trafficControl?: TrafficControlParameters;
        acsCommitmentsCatchup?: AcsCommitmentsCatchUpConfig;
        preparationTimeRecordTimeTolerance?: TopologyDuration;
    } = {}) {
        this.confirmationResponseTimeout = init.confirmationResponseTimeout;
        this.mediatorReactionTimeout = init.mediatorReactionTimeout;
        this.assignmentExclusivityTimeout = init.assignmentExclusivityTimeout;
        this.ledgerTimeRecordTimeTolerance =
            init.ledgerTimeRecordTimeTolerance;
        this.reconciliationInterval = init.reconciliationInterval;
        this.mediatorDeduplicationTimeout =
            init.mediatorDeduplicationTimeout;
        this.maxRequestSize = init.maxRequestSize ?? 0;
        this.onboardingRestriction =
            init.onboardingRestriction ?? OnboardingRestriction.unspecified;
        this.participantSynchronizerLimits =
            init.participantSynchronizerLimits;
        this.sequencerAggregateSubmissionTimeout =
            init.sequencerAggregateSubmissionTimeout;
        this.trafficControl = init.trafficControl;
        this.acsCommitmentsCatchup = init.acsCommitmentsCatchup;
        this.preparationTimeRecordTimeTolerance =
            init.preparationTimeRecordTimeTolerance;
    }
}
