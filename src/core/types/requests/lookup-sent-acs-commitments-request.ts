import { SentAcsCommitmentState } from "../sent-acs-commitment-state.js";
import { SynchronizerTimeRange } from "../synchronizer-time-range.js";

export class LookupSentAcsCommitmentsRequest {
    public readonly timeRanges: readonly SynchronizerTimeRange[];
    public readonly counterParticipantIds: readonly string[];
    public readonly commitmentState: readonly SentAcsCommitmentState[];
    public readonly verbose: boolean;

    public constructor(init: {
        timeRanges?: readonly SynchronizerTimeRange[];
        counterParticipantIds?: readonly string[];
        commitmentState?: readonly SentAcsCommitmentState[];
        verbose?: boolean;
    } = {}) {
        this.timeRanges = [...(init.timeRanges ?? [])];
        this.counterParticipantIds = [...(init.counterParticipantIds ?? [])];
        this.commitmentState = [...(init.commitmentState ?? [])];
        this.verbose = init.verbose ?? false;
    }
}
