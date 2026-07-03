import { DamlLfNodeKind } from "./daml-lf-node-kind.js";
import { DamlLfType } from "./daml-lf-type.js";

export class DamlLfChoiceParameter {
    public readonly nodeKind = DamlLfNodeKind.choiceParameter;
    public readonly name: string;
    public readonly type: DamlLfType;

    public constructor(init: { name: string; type: DamlLfType }) {
        this.name = init.name;
        this.type = init.type;
    }
}
