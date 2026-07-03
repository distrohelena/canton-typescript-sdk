export class QueryContractsResponse<TContract = unknown> {
    public readonly contracts: readonly TContract[];

    public constructor(init: { contracts: readonly TContract[] }) {
        this.contracts = init.contracts;
    }
}
