import { DamlLfChoiceParameter } from "./daml-lf-choice-parameter.js";
import { DamlLfNodeKind } from "./daml-lf-node-kind.js";
import { DamlLfType } from "./daml-lf-type.js";

export class DamlLfChoice {
    public readonly nodeKind = DamlLfNodeKind.choice;
    public readonly name: string;
    public readonly consuming: boolean;
    public readonly parameter: DamlLfChoiceParameter;
    public readonly returnType: DamlLfType;

    public constructor(init: {
        name: string;
        parameter: DamlLfChoiceParameter;
        consuming?: boolean;
        returnType?: DamlLfType;
    }) {
        this.name = init.name;
        this.parameter = init.parameter;
        this.consuming = init.consuming ?? true;
        this.returnType = init.returnType ?? init.parameter.type;
    }
}
