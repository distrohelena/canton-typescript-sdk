import { DamlLfNodeKind } from "./daml-lf-node-kind.js";

export interface IDamlLfValueReference {
    readonly packageId: string;
    readonly moduleName: string;
    readonly definitionName: string;
}

export interface IDamlLfExpressionSourceLocation {
    readonly packageId?: string;
    readonly moduleName?: string;
    readonly startLine: number;
    readonly startColumn: number;
    readonly endLine: number;
    readonly endColumn: number;
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

export interface IDamlLfRecordUpdateExpression {
    readonly fieldName: string;
    readonly record: DamlLfExpression;
    readonly value: DamlLfExpression;
}

export type DamlLfBuiltinConstructor = "unit" | "false" | "true";
export type DamlLfBuiltinFunction =
    | "equal"
    | "greater"
    | "appendText"
    | string;

export interface IDamlLfVariantConstructionExpression {
    readonly constructorName: string;
    readonly argument: DamlLfExpression;
}

export interface IDamlLfOptionalConstructionExpression {
    readonly value?: DamlLfExpression;
}

export interface IDamlLfEnumConstructionExpression {
    readonly constructorName: string;
}

export interface IDamlLfListConstructionExpression {
    readonly front: readonly DamlLfExpression[];
    readonly tail?: DamlLfExpression;
}

export interface IDamlLfUpdateBinding {
    readonly name: string;
    readonly value: DamlLfExpression;
}

export interface IDamlLfUpdateExpression {
    readonly kind:
        | "pure"
        | "block"
        | "embedExpr"
        | "create"
        | "fetch"
        | "exercise";
    readonly expression?: DamlLfExpression;
    readonly bindings?: readonly IDamlLfUpdateBinding[];
    readonly body?: DamlLfExpression;
    readonly templateId?: {
        readonly packageId: string;
        readonly moduleName: string;
        readonly templateName: string;
    };
    readonly choiceName?: string;
    readonly contractId?: DamlLfExpression;
    readonly argument?: DamlLfExpression;
}

export interface IDamlLfCaseAlternative {
    readonly patternKind:
        | "default"
        | "builtinCon"
        | "variant"
        | "optionalNone"
        | "optionalSome"
        | "enum"
        | "nil"
        | "cons";
    readonly builtinConstructor?: DamlLfBuiltinConstructor;
    readonly constructorName?: string;
    readonly binderName?: string;
    readonly headBinderName?: string;
    readonly tailBinderName?: string;
    readonly body: DamlLfExpression;
}

export interface IDamlLfCaseExpression {
    readonly scrutinee: DamlLfExpression;
    readonly alternatives: readonly IDamlLfCaseAlternative[];
}

export class DamlLfExpression {
    public readonly nodeKind = DamlLfNodeKind.expression;
    public readonly textLiteral?: string;
    public readonly int64Literal?: string;
    public readonly valueReference?: IDamlLfValueReference;
    public readonly variableName?: string;
    public readonly lambda?: IDamlLfLambdaExpression;
    public readonly application?: IDamlLfApplicationExpression;
    public readonly letExpression?: IDamlLfLetExpression;
    public readonly recordConstruction?: IDamlLfRecordConstructionExpression;
    public readonly recordProjection?: IDamlLfRecordProjectionExpression;
    public readonly recordUpdate?: IDamlLfRecordUpdateExpression;
    public readonly builtinConstructor?: DamlLfBuiltinConstructor;
    public readonly builtinFunction?: DamlLfBuiltinFunction;
    public readonly caseExpression?: IDamlLfCaseExpression;
    public readonly variantConstruction?: IDamlLfVariantConstructionExpression;
    public readonly optionalConstruction?: IDamlLfOptionalConstructionExpression;
    public readonly enumConstruction?: IDamlLfEnumConstructionExpression;
    public readonly listConstruction?: IDamlLfListConstructionExpression;
    public readonly updateExpression?: IDamlLfUpdateExpression;
    public readonly unsupportedNodeKind?: string;
    public readonly sourceLocation?: IDamlLfExpressionSourceLocation;

    public constructor(init: {
        textLiteral?: string;
        int64Literal?: string;
        valueReference?: IDamlLfValueReference;
        variableName?: string;
        lambda?: IDamlLfLambdaExpression;
        application?: IDamlLfApplicationExpression;
        letExpression?: IDamlLfLetExpression;
        recordConstruction?: IDamlLfRecordConstructionExpression;
        recordProjection?: IDamlLfRecordProjectionExpression;
        recordUpdate?: IDamlLfRecordUpdateExpression;
        builtinConstructor?: DamlLfBuiltinConstructor;
        builtinFunction?: DamlLfBuiltinFunction;
        caseExpression?: IDamlLfCaseExpression;
        variantConstruction?: IDamlLfVariantConstructionExpression;
        optionalConstruction?: IDamlLfOptionalConstructionExpression;
        enumConstruction?: IDamlLfEnumConstructionExpression;
        listConstruction?: IDamlLfListConstructionExpression;
        updateExpression?: IDamlLfUpdateExpression;
        unsupportedNodeKind?: string;
        sourceLocation?: IDamlLfExpressionSourceLocation;
    }) {
        this.textLiteral = init.textLiteral;
        this.int64Literal = init.int64Literal;
        this.valueReference = init.valueReference;
        this.variableName = init.variableName;
        this.lambda = init.lambda;
        this.application = init.application;
        this.letExpression = init.letExpression;
        this.recordConstruction = init.recordConstruction;
        this.recordProjection = init.recordProjection;
        this.recordUpdate = init.recordUpdate;
        this.builtinConstructor = init.builtinConstructor;
        this.builtinFunction = init.builtinFunction;
        this.caseExpression = init.caseExpression;
        this.variantConstruction = init.variantConstruction;
        this.optionalConstruction = init.optionalConstruction;
        this.enumConstruction = init.enumConstruction;
        this.listConstruction = init.listConstruction;
        this.updateExpression = init.updateExpression;
        this.unsupportedNodeKind = init.unsupportedNodeKind;
        this.sourceLocation = init.sourceLocation;
    }

    public withSourceLocation(
        sourceLocation: IDamlLfExpressionSourceLocation | undefined,
    ): DamlLfExpression {
        if (sourceLocation === undefined) {
            return this;
        }

        return new DamlLfExpression({
            textLiteral: this.textLiteral,
            int64Literal: this.int64Literal,
            valueReference: this.valueReference,
            variableName: this.variableName,
            lambda: this.lambda,
            application: this.application,
            letExpression: this.letExpression,
            recordConstruction: this.recordConstruction,
            recordProjection: this.recordProjection,
            recordUpdate: this.recordUpdate,
            builtinConstructor: this.builtinConstructor,
            builtinFunction: this.builtinFunction,
            caseExpression: this.caseExpression,
            variantConstruction: this.variantConstruction,
            optionalConstruction: this.optionalConstruction,
            enumConstruction: this.enumConstruction,
            listConstruction: this.listConstruction,
            updateExpression: this.updateExpression,
            unsupportedNodeKind: this.unsupportedNodeKind,
            sourceLocation,
        });
    }
}
