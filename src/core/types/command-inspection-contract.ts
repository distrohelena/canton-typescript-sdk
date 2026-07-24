import type { TemplateId } from "../../query/model-types.js";

export class CommandInspectionContract {
    public readonly templateId?: TemplateId;
    public readonly contractId: string;
    public readonly contractKey?: unknown;

    public constructor(init: {
        contractId: string;
        templateId?: TemplateId;
        contractKey?: unknown;
    }) {
        this.templateId = init.templateId;
        this.contractId = init.contractId;
        this.contractKey = init.contractKey;
    }
}
