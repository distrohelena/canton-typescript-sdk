import { DamlLfDefinition } from "./daml-lf-definition.js";
import { DamlLfExpression } from "./daml-lf-expression.js";
import { DamlLfNodeKind } from "./daml-lf-node-kind.js";
import { DamlLfType } from "./daml-lf-type.js";

export class DamlLfValueDefinition extends DamlLfDefinition {
    public readonly nodeKind = DamlLfNodeKind.valueDefinition;
    public readonly type: DamlLfType;
    public readonly expression: DamlLfExpression;

    public constructor(init: {
        name: string;
        type: DamlLfType;
        expression: DamlLfExpression;
    }) {
        super({
            name: init.name,
        });
        this.type = init.type;
        this.expression = init.expression;
    }
}
