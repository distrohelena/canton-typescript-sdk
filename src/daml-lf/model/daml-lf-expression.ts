import { DamlLfNodeKind } from "./daml-lf-node-kind.js";

export interface IDamlLfValueReference {
    readonly packageId: string;
    readonly moduleName: string;
    readonly definitionName: string;
}

export interface IDamlLfLambdaExpression {
    readonly parameters: readonly string[];
    readonly body: DamlLfExpression;
}

export interface IDamlLfApplicationExpression {
    readonly function: DamlLfExpression;
    readonly arguments: readonly DamlLfExpression[];
}

export interface IDamlLfLetBinding {
    readonly name: string;
    readonly value: DamlLfExpression;
}

export interface IDamlLfLetExpression {
    readonly bindings: readonly IDamlLfLetBinding[];
    readonly body: DamlLfExpression;
}

export class DamlLfExpression {
    public readonly nodeKind = DamlLfNodeKind.expression;
    public readonly textLiteral?: string;
    public readonly valueReference?: IDamlLfValueReference;
    public readonly variableName?: string;
    public readonly lambda?: IDamlLfLambdaExpression;
    public readonly application?: IDamlLfApplicationExpression;
    public readonly letExpression?: IDamlLfLetExpression;

    public constructor(init: {
        textLiteral?: string;
        valueReference?: IDamlLfValueReference;
        variableName?: string;
        lambda?: IDamlLfLambdaExpression;
        application?: IDamlLfApplicationExpression;
        letExpression?: IDamlLfLetExpression;
    }) {
        this.textLiteral = init.textLiteral;
        this.valueReference = init.valueReference;
        this.variableName = init.variableName;
        this.lambda = init.lambda;
        this.application = init.application;
        this.letExpression = init.letExpression;
    }
}
