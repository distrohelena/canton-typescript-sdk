import { CantonError } from "../../core/errors/canton-error.js";

export type QuerySnapshotIncompleteReason =
    | "invalid-offset"
    | "participant-pruned"
    | "max-pages-exceeded"
    | "max-updates-exceeded"
    | "max-active-contracts-exceeded"
    | "missing-boundary"
    | "page-boundary-mismatch"
    | "nonterminal-page-without-token"
    | "nonterminal-page-reaches-end"
    | "repeated-page-token"
    | "missing-active-at-offset"
    | "active-at-offset-mismatch"
    | "empty-active-contract-page";

export class QuerySnapshotIncompleteError extends CantonError {
    public readonly beginExclusive: string;
    public readonly endInclusive: string;
    public readonly activeAtOffset?: string;
    public readonly reason: QuerySnapshotIncompleteReason;

    public constructor(init: {
        beginExclusive: string;
        endInclusive: string;
        activeAtOffset?: string;
        reason: QuerySnapshotIncompleteReason;
    }) {
        super(`gRPC query snapshot is incomplete: ${init.reason}.`);
        this.beginExclusive = init.beginExclusive;
        this.endInclusive = init.endInclusive;
        this.activeAtOffset = init.activeAtOffset;
        this.reason = init.reason;
        Object.freeze(this);
    }
}
