import { RegisteredSynchronizerConnection } from "./registered-synchronizer-connection.js";
import { RegisteredSynchronizerConnectionPoolDelays } from "./registered-synchronizer-connection-pool-delays.js";
import { RegisteredSynchronizerSubmissionRequestAmplification } from "./registered-synchronizer-submission-request-amplification.js";
import { RegisteredSynchronizerSubscriptionLivenessLimits } from "./registered-synchronizer-subscription-liveness-limits.js";

export class RegisteredSynchronizerSequencerConnections {
    public readonly sequencerConnections: readonly RegisteredSynchronizerConnection[];
    public readonly sequencerTrustThreshold: number;
    public readonly submissionRequestAmplification?: RegisteredSynchronizerSubmissionRequestAmplification;
    public readonly sequencerLivenessMargin: number;
    public readonly sequencerConnectionPoolDelays?: RegisteredSynchronizerConnectionPoolDelays;
    public readonly subscriptionLivenessLimits?: RegisteredSynchronizerSubscriptionLivenessLimits;

    public constructor(init: {
        sequencerConnections?: readonly RegisteredSynchronizerConnection[];
        sequencerTrustThreshold?: number;
        submissionRequestAmplification?: RegisteredSynchronizerSubmissionRequestAmplification;
        sequencerLivenessMargin?: number;
        sequencerConnectionPoolDelays?: RegisteredSynchronizerConnectionPoolDelays;
        subscriptionLivenessLimits?: RegisteredSynchronizerSubscriptionLivenessLimits;
    } = {}) {
        this.sequencerConnections = [...(init.sequencerConnections ?? [])];
        this.sequencerTrustThreshold = init.sequencerTrustThreshold ?? 0;
        this.submissionRequestAmplification =
            init.submissionRequestAmplification;
        this.sequencerLivenessMargin = init.sequencerLivenessMargin ?? 0;
        this.sequencerConnectionPoolDelays =
            init.sequencerConnectionPoolDelays;
        this.subscriptionLivenessLimits = init.subscriptionLivenessLimits;
    }
}
