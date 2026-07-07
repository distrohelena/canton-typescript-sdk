import { SentAcsCommitment } from "./sent-acs-commitment.js";

export class SentAcsCommitmentPerSynchronizer {
    public readonly synchronizerId: string;
    public readonly sent: readonly SentAcsCommitment[];

    public constructor(init: {
        synchronizerId: string;
        sent: readonly SentAcsCommitment[];
    }) {
        this.synchronizerId = init.synchronizerId;
        this.sent = [...init.sent];
    }
}
