import { DamlLfNodeKind } from "./daml-lf-node-kind.js";

export class DamlLfExpression {
    public readonly nodeKind = DamlLfNodeKind.expression;
    public readonly textLiteral?: string;
    public readonly valueReference?: {
        packageId: string;
        moduleName: string;
        definitionName: string;
    };

    public constructor(init: {
        textLiteral?: string;
        valueReference?: {
            packageId: string;
            moduleName: string;
            definitionName: string;
        };
    }) {
        this.textLiteral = init.textLiteral;
        this.valueReference = init.valueReference;
    }
}
