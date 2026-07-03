export class QueryContractsRequest {
    public readonly templateId: string;

    public constructor(init: { templateId: string }) {
        this.templateId = init.templateId;
    }
}
