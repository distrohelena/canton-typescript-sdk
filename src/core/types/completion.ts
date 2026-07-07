import { SynchronizerTime } from "./synchronizer-time.js";

export class Completion {
    public readonly commandId: string;
    public readonly status?: unknown;
    public readonly updateId?: string;
    public readonly userId: string;
    public readonly actAs: readonly string[];
    public readonly submissionId?: string;
    public readonly deduplicationOffset?: string;
    public readonly deduplicationDuration?: {
        seconds: string;
        nanos: number;
    };
    public readonly traceContext?: unknown;
    public readonly offset: string;
    public readonly synchronizerTime?: SynchronizerTime;
    public readonly paidTrafficCost: string;
    public readonly transactionHash?: Uint8Array;

    public constructor(init: {
        commandId: string;
        status?: unknown;
        updateId?: string;
        userId: string;
        actAs?: readonly string[];
        submissionId?: string;
        deduplicationOffset?: string;
        deduplicationDuration?: {
            seconds: string;
            nanos: number;
        };
        traceContext?: unknown;
        offset: string;
        synchronizerTime?: SynchronizerTime;
        paidTrafficCost?: string;
        transactionHash?: Uint8Array;
    }) {
        this.commandId = init.commandId;
        this.status = init.status;
        this.updateId = init.updateId;
        this.userId = init.userId;
        this.actAs = init.actAs ?? [];
        this.submissionId = init.submissionId;
        this.deduplicationOffset = init.deduplicationOffset;
        this.deduplicationDuration = init.deduplicationDuration;
        this.traceContext = init.traceContext;
        this.offset = init.offset;
        this.synchronizerTime = init.synchronizerTime;
        this.paidTrafficCost = init.paidTrafficCost ?? "0";
        this.transactionHash = init.transactionHash;
    }
}
