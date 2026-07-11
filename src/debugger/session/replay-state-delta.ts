export interface IReplayStateDeltaTemplateId {
    readonly packageId?: string;
    readonly moduleName?: string;
    readonly entityName?: string;
}

export class ReplayStateDelta {
    public readonly kind: string;
    public readonly eventOrdinal?: number;
    public readonly comparisonKey?: string;
    public readonly createdContractId?: string;
    public readonly targetContractId?: string;
    public readonly templateId?: IReplayStateDeltaTemplateId;
    public readonly choice?: string;
    public readonly choiceArgument?: unknown;
    public readonly payload?: unknown;
    public readonly consuming?: boolean;

    public constructor(init: {
        kind: string;
        eventOrdinal?: number;
        comparisonKey?: string;
        createdContractId?: string;
        targetContractId?: string;
        templateId?: IReplayStateDeltaTemplateId;
        choice?: string;
        choiceArgument?: unknown;
        payload?: unknown;
        consuming?: boolean;
    }) {
        this.kind = init.kind;
        this.eventOrdinal = init.eventOrdinal;
        this.comparisonKey = init.comparisonKey;
        this.createdContractId = init.createdContractId;
        this.targetContractId = init.targetContractId;
        this.templateId = init.templateId;
        this.choice = init.choice;
        this.choiceArgument = init.choiceArgument;
        this.payload = init.payload;
        this.consuming = init.consuming;
    }
}
