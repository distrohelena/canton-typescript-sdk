import { CommitmentTimeRange } from "./commitment-time-range.js";

export class SynchronizerTimeRange {
    public readonly synchronizerId: string;
    public readonly interval?: CommitmentTimeRange;

    public constructor(init: {
        synchronizerId: string;
        interval?: CommitmentTimeRange;
    }) {
        this.synchronizerId = init.synchronizerId;
        this.interval = init.interval;
    }
}
