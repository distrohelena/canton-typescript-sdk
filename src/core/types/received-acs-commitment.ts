import { CommitmentInterval } from "./commitment-interval.js";
import { ReceivedAcsCommitmentState } from "./received-acs-commitment-state.js";

export class ReceivedAcsCommitment {
    public readonly interval?: CommitmentInterval;
    public readonly originCounterParticipantUid: string;
    public readonly receivedCommitment?: Uint8Array;
    public readonly ownCommitment?: Uint8Array;
    public readonly state: ReceivedAcsCommitmentState;

    public constructor(init: {
        interval?: CommitmentInterval;
        originCounterParticipantUid: string;
        receivedCommitment?: Uint8Array;
        ownCommitment?: Uint8Array;
        state: ReceivedAcsCommitmentState;
    }) {
        this.interval = init.interval;
        this.originCounterParticipantUid = init.originCounterParticipantUid;
        this.receivedCommitment =
            init.receivedCommitment === undefined
                ? undefined
                : new Uint8Array(init.receivedCommitment);
        this.ownCommitment =
            init.ownCommitment === undefined
                ? undefined
                : new Uint8Array(init.ownCommitment);
        this.state = init.state;
    }
}
