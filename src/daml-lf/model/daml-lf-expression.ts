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

export interface IDamlLfRecordFieldExpression {
    readonly name: string;
    readonly value: DamlLfExpression;
}

export interface IDamlLfRecordConstructionExpression {
    readonly fields: readonly IDamlLfRecordFieldExpression[];
}

export interface IDamlLfRecordProjectionExpression {
    readonly fieldName: string;
    readonly record: DamlLfExpression;
}

export type DamlLfBuiltinConstructor = "unit" | "false" | "true";

export interface IDamlLfVariantConstructionExpression {
    readonly constructorName: string;
    readonly argument: DamlLfExpression;
}

export interface IDamlLfOptionalConstructionExpression {
    readonly value?: DamlLfExpression;
}

export interface IDamlLfCaseAlternative {
    readonly patternKind:
        | "default"
        | "builtinCon"
        | "variant"
        | "optionalNone"
        | "optionalSome";
    readonly builtinConstructor?: DamlLfBuiltinConstructor;
    readonly constructorName?: string;
    readonly binderName?: string;
    readonly body: DamlLfExpression;
}

export interface IDamlLfCaseExpression {
    readonly scrutinee: DamlLfExpression;
    readonly alternatives: readonly IDamlLfCaseAlternative[];
}

export class DamlLfExpression {
    public readonly nodeKind = DamlLfNodeKind.expression;
    public readonly textLiteral?: string;
    public readonly valueReference?: IDamlLfValueReference;
    public readonly variableName?: string;
    public readonly lambda?: IDamlLfLambdaExpression;
    public readonly application?: IDamlLfApplicationExpression;
    public readonly letExpression?: IDamlLfLetExpression;
    public readonly recordConstruction?: IDamlLfRecordConstructionExpression;
    public readonly recordProjection?: IDamlLfRecordProjectionExpression;
    public readonly builtinConstructor?: DamlLfBuiltinConstructor;
    public readonly caseExpression?: IDamlLfCaseExpression;
    public readonly variantConstruction?: IDamlLfVariantConstructionExpression;
    public readonly optionalConstruction?: IDamlLfOptionalConstructionExpression;

    public constructor(init: {
        textLiteral?: string;
        valueReference?: IDamlLfValueReference;
        variableName?: string;
        lambda?: IDamlLfLambdaExpression;
        application?: IDamlLfApplicationExpression;
        letExpression?: IDamlLfLetExpression;
        recordConstruction?: IDamlLfRecordConstructionExpression;
        recordProjection?: IDamlLfRecordProjectionExpression;
        builtinConstructor?: DamlLfBuiltinConstructor;
        caseExpression?: IDamlLfCaseExpression;
        variantConstruction?: IDamlLfVariantConstructionExpression;
        optionalConstruction?: IDamlLfOptionalConstructionExpression;
    }) {
        this.textLiteral = init.textLiteral;
        this.valueReference = init.valueReference;
        this.variableName = init.variableName;
        this.lambda = init.lambda;
        this.application = init.application;
        this.letExpression = init.letExpression;
        this.recordConstruction = init.recordConstruction;
        this.recordProjection = init.recordProjection;
        this.builtinConstructor = init.builtinConstructor;
        this.caseExpression = init.caseExpression;
        this.variantConstruction = init.variantConstruction;
        this.optionalConstruction = init.optionalConstruction;
    }
}
