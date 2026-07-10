import { DamlLfChoiceParameter } from "./daml-lf-choice-parameter.js";
import { DamlLfExpression } from "./daml-lf-expression.js";
import { DamlLfNodeKind } from "./daml-lf-node-kind.js";
import { DamlLfType } from "./daml-lf-type.js";

export class DamlLfChoice {
    public readonly nodeKind = DamlLfNodeKind.choice;
    public readonly name: string;
    public readonly consuming: boolean;
    public readonly selfBinderName: string;
    public readonly parameter: DamlLfChoiceParameter;
    public readonly returnType: DamlLfType;
    public readonly updateExpression?: DamlLfExpression;

    public constructor(init: {
        name: string;
        selfBinderName: string;
        parameter: DamlLfChoiceParameter;
        consuming?: boolean;
        returnType?: DamlLfType;
        updateExpression?: DamlLfExpression;
    }) {
        this.name = init.name;
        this.parameter = init.parameter;
        this.consuming = init.consuming ?? true;
        this.selfBinderName = init.selfBinderName;
        this.returnType = init.returnType ?? init.parameter.type;
        this.updateExpression = init.updateExpression;
    }
}
