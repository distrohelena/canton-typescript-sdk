import { CommitmentInterval } from "./commitment-interval.js";
import { SentAcsCommitmentState } from "./sent-acs-commitment-state.js";

export class SentAcsCommitment {
    public readonly interval?: CommitmentInterval;
    public readonly destCounterParticipantUid: string;
    public readonly ownCommitment?: Uint8Array;
    public readonly receivedCommitment?: Uint8Array;
    public readonly state: SentAcsCommitmentState;

    public constructor(init: {
        interval?: CommitmentInterval;
        destCounterParticipantUid: string;
        ownCommitment?: Uint8Array;
        receivedCommitment?: Uint8Array;
        state: SentAcsCommitmentState;
    }) {
        this.interval = init.interval;
        this.destCounterParticipantUid = init.destCounterParticipantUid;
        this.ownCommitment =
            init.ownCommitment === undefined
                ? undefined
                : new Uint8Array(init.ownCommitment);
        this.receivedCommitment =
            init.receivedCommitment === undefined
                ? undefined
                : new Uint8Array(init.receivedCommitment);
        this.state = init.state;
    }
}
