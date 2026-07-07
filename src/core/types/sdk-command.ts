export class SdkCommand {
    public readonly type: string;
    public readonly templateId?: string;
    public readonly contractId?: string;
    public readonly contractKey?: unknown;
    public readonly choice?: string;
    public readonly createArguments?: Record<string, unknown>;
    public readonly choiceArgument?: unknown;

    public constructor(init: {
        type: string;
        templateId?: string;
        contractId?: string;
        contractKey?: unknown;
        choice?: string;
        createArguments?: Record<string, unknown>;
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
