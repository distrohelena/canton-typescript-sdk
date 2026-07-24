import type { DamlRecord } from "./daml-values.js";
import type { TemplateId } from "../../query/model-types.js";

export class SdkCommand {
    public readonly type: string;
    public readonly templateId?: TemplateId;
    public readonly contractId?: string;
    public readonly contractKey?: unknown;
    public readonly choice?: string;
    public readonly createArguments?: DamlRecord;
    public readonly choiceArgument?: unknown;

    public constructor(init: {
        type: string;
        templateId?: TemplateId;
        contractId?: string;
        contractKey?: unknown;
        choice?: string;
        createArguments?: DamlRecord;
        choiceArgument?: unknown;
    }) {
        this.type = init.type;
        this.templateId = init.templateId;
        this.contractId = init.contractId;
        this.contractKey = init.contractKey;
        this.choice = init.choice;
        this.createArguments = init.createArguments;
        this.choiceArgument = init.choiceArgument;
    }
}
