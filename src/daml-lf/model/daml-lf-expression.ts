import { DamlLfNodeKind } from "./daml-lf-node-kind.js";

export class DamlLfExpression {
    public readonly nodeKind = DamlLfNodeKind.expression;
    public readonly textLiteral?: string;

    public constructor(init: { textLiteral?: string }) {
        this.textLiteral = init.textLiteral;
    }
}
