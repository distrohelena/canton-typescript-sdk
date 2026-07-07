export class GetContractRequest {
    public readonly contractId: string;
    public readonly queryingParties: readonly string[];

    public constructor(init: {
        contractId: string;
        queryingParties?: readonly string[];
    }) {
        this.contractId = init.contractId;
        this.queryingParties = init.queryingParties ?? [];
    }
}
