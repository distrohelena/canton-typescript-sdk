import { ReceivedAcsCommitment } from "./received-acs-commitment.js";

export class ReceivedAcsCommitmentPerSynchronizer {
    public readonly synchronizerId: string;
    public readonly received: readonly ReceivedAcsCommitment[];

    public constructor(init: {
        synchronizerId: string;
        received: readonly ReceivedAcsCommitment[];
    }) {
        this.synchronizerId = init.synchronizerId;
        this.received = [...init.received];
    }
}
