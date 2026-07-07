import { SynchronizerTime } from "../synchronizer-time.js";

export class GetLedgerEndResponse {
    public readonly offset: string;
    public readonly synchronizerTimes: readonly SynchronizerTime[];

    public constructor(init: {
        offset: string;
        synchronizerTimes?: readonly SynchronizerTime[];
    }) {
        this.offset = init.offset;
        this.synchronizerTimes = init.synchronizerTimes ?? [];
    }
}
