import { normalizeReplayLedgerValue } from "../../../src/debugger/replay/replay-ledger-value-normalizer.js";
import { ledgerValueArbitrary } from "./daml-lf-ledger-values.js";

export const replayObservedExerciseArbitrary = ledgerValueArbitrary.map((raw) => ({
    raw,
    normalized: normalizeReplayLedgerValue(raw),
}));
