import { CantonError } from "../../core/errors/canton-error.js";

/**
 * gRPC typed queries never replay ledger history implicitly: transactions/events/exercises queries — and
 * contracts queries whose predicates or includes reach archived state — require the walkHistory option, so
 * the (potentially very expensive) replay only ever happens when the caller asked for it.
 */
export class HistoryWalkRequiredError extends CantonError {
    public constructor(public readonly relation: string) {
        super(
            `The "${relation}" query requires replaying ledger history, which is disabled by default. `
                + "Enable the walkHistory option to permit it (pair it with incrementalHistory so repeat "
                + "queries fetch only new offsets), or reshape the query to active-only state served by the "
                + "contract cache.",
        );
    }
}
