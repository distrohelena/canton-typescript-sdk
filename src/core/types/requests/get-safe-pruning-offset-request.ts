import { SafeToPruneCommitmentState } from "../safe-to-prune-commitment-state.js";

export class GetSafePruningOffsetRequest {
    public readonly beforeOrAt?: Date;
    public readonly ledgerEnd: string;
    public readonly counterParticipantsCommitmentsState?: SafeToPruneCommitmentState;

    public constructor(init: {
        beforeOrAt?: Date;
        ledgerEnd: string;
        counterParticipantsCommitmentsState?: SafeToPruneCommitmentState;
    }) {
        this.beforeOrAt = init.beforeOrAt;
        this.ledgerEnd = init.ledgerEnd;
        this.counterParticipantsCommitmentsState =
            init.counterParticipantsCommitmentsState;
    }
}
