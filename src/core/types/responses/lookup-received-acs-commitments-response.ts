import { ReceivedAcsCommitmentPerSynchronizer } from "../received-acs-commitment-per-synchronizer.js";

export class LookupReceivedAcsCommitmentsResponse {
    public readonly received: readonly ReceivedAcsCommitmentPerSynchronizer[];

    public constructor(init: {
        received: readonly ReceivedAcsCommitmentPerSynchronizer[];
    }) {
        this.received = [...init.received];
    }
}
