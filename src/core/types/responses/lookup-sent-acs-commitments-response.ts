import { SentAcsCommitmentPerSynchronizer } from "../sent-acs-commitment-per-synchronizer.js";

export class LookupSentAcsCommitmentsResponse {
    public readonly sent: readonly SentAcsCommitmentPerSynchronizer[];

    public constructor(init: {
        sent: readonly SentAcsCommitmentPerSynchronizer[];
    }) {
        this.sent = [...init.sent];
    }
}
