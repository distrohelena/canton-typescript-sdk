export class GetLatestPrunedOffsetsResponse {
    public readonly participantPrunedUpToInclusive: string;
    public readonly allDivulgedContractsPrunedUpToInclusive: string;

    public constructor(init: {
        participantPrunedUpToInclusive: string;
        allDivulgedContractsPrunedUpToInclusive?: string;
    }) {
        this.participantPrunedUpToInclusive =
            init.participantPrunedUpToInclusive;
        this.allDivulgedContractsPrunedUpToInclusive =
            init.allDivulgedContractsPrunedUpToInclusive ?? "0";
    }
}
