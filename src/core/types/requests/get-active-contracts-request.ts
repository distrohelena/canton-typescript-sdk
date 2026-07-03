export class GetActiveContractsRequest {
    public readonly party: string;
    public readonly templateId?: string;

    public constructor(init: {
        party: string;
        templateId?: string;
    }) {
        this.party = init.party;
        this.templateId = init.templateId;
    }
}
