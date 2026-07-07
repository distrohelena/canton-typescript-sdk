export class CommandInspectionContract {
    public readonly templateId?: string;
    public readonly contractId: string;
    public readonly contractKey?: unknown;

    public constructor(init: {
        contractId: string;
        templateId?: string;
        contractKey?: unknown;
    }) {
        this.templateId = init.templateId;
        this.contractId = init.contractId;
        this.contractKey = init.contractKey;
    }
}
