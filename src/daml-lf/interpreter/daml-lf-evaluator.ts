import { ValidationError } from "../../core/errors/validation-error.js";
import { DamlLfCompilation } from "../daml-lf-compilation.js";
import { DamlLfExpression } from "../model/daml-lf-expression.js";
import { DamlLfTemplateId } from "../model/daml-lf-template-id.js";
import { DamlLfValueDefinition } from "../model/daml-lf-value-definition.js";
import { TypeConReference } from "../model/type-con-reference.js";
import { DamlLfBuiltinDispatch } from "./daml-lf-builtin-dispatch.js";
import { DamlLfLexicalScope } from "./daml-lf-lexical-scope.js";
import {
    DAML_LF_CONTRACT_ID_MARKER_KEY,
    DAML_LF_RECORD_ID_MARKER_KEY,
    IDamlLfRuntimeValue,
} from "./daml-lf-runtime-value.js";
import { DamlLfRuntimeFrame } from "./daml-lf-runtime-frame.js";
import { DamlLfStepKind } from "./daml-lf-step-kind.js";
import {
    IDamlLfReplayEffect,
    IDamlLfTraceSink,
} from "./daml-lf-trace-sink.interface.js";

interface ITextRuntimeValue extends IDamlLfRuntimeValue {
    readonly kind: "text";
    readonly value: string;
}

interface IInt64RuntimeValue extends IDamlLfRuntimeValue {
    readonly kind: "int64";
    readonly value: string;
}

interface IBooleanRuntimeValue extends IDamlLfRuntimeValue {
    readonly kind: "boolean";
    readonly value: boolean;
}

interface IUnitRuntimeValue extends IDamlLfRuntimeValue {
    readonly kind: "unit";
}

interface IClosureRuntimeValue extends IDamlLfRuntimeValue {
    readonly kind: "closure";
    readonly parameters: readonly string[];
    readonly body: DamlLfExpression;
    readonly frame: DamlLfRuntimeFrame;
}

interface ILedgerValueRuntimeValue extends IDamlLfRuntimeValue {
    readonly kind: "ledgerValue";
    readonly value: unknown;
    readonly contractId?: string;
}

interface IRecordRuntimeValue extends IDamlLfRuntimeValue {
    readonly kind: "record";
    readonly fields: Readonly<Record<string, IDamlLfRuntimeValue>>;
}

interface IContractIdRuntimeValue extends IDamlLfRuntimeValue {
    readonly kind: "contractId";
    readonly value: string;
}

interface IBuiltinRuntimeValue extends IDamlLfRuntimeValue {
    readonly kind: "builtin";
    readonly builtinFunction: string;
    readonly appliedArguments: readonly IDamlLfRuntimeValue[];
}

export interface IDamlLfReplayEnvironment {
    readonly offset: string;
    readonly entrypoint: {
        readonly kind: "create" | "exercise";
        readonly templateId?: {
            readonly packageId?: string;
            readonly moduleName?: string;
            readonly entityName?: string;
        };
        readonly contractId?: string;
        readonly choice?: string;
        readonly argument?: unknown;
    };
    readonly contracts?: ReadonlyMap<string, { readonly payload: unknown }>;
    readonly definitionResolver?: IReplayDefinitionResolver;
    readonly entrypointExpression?: DamlLfExpression;
    readonly entrypointBindingMode?:
        | "standard"
        | "createWrapper"
        | "exerciseWrapper"
        | "templateChoice";
}

export interface IDamlLfReplayEvaluationResult {
    readonly value: IDamlLfRuntimeValue;
    readonly effects: readonly IDamlLfReplayEffect[];
}

interface IActiveReplayContext {
    readonly environment: IDamlLfReplayEnvironment;
    readonly effects: IDamlLfReplayEffect[];
    readonly createdContracts: Map<string, unknown>;
    nextSyntheticContractIdNumber: number;
}

interface IReplayBindingValue {
    readonly value: unknown;
    readonly contractId?: string;
}

interface IReplayDefinitionResolver {
    resolveChoiceDefinitionOrThrow?(
        templateId: DamlLfTemplateId,
        choiceName: string,
    ): {
        readonly packageId: string;
        readonly moduleName: string;
        readonly definition: DamlLfValueDefinition;
        readonly frameIdentity?: {
            readonly packageId: string;
            readonly moduleName: string;
        };
        readonly replayExpression: DamlLfExpression;
        readonly replayBindingMode:
            | "standard"
            | "createWrapper"
            | "exerciseWrapper"
            | "templateChoice";
    };
}

export class DamlLfEvaluator {
    private nextFrameNumber = 1;
    private activeReplayContext?: IActiveReplayContext;
    private readonly semanticModel;

    public constructor(
        private readonly compilation: DamlLfCompilation,
        private readonly builtinDispatch = new DamlLfBuiltinDispatch(),
    ) {
        this.semanticModel = this.compilation.createSemanticModel();
        void this.compilation;
    }

    public getCompilation(): DamlLfCompilation {
        return this.compilation;
    }

    public getBuiltinDispatch(): DamlLfBuiltinDispatch {
        return this.builtinDispatch;
    }

    public evaluateValueDefinitionOrThrow(
        definition: DamlLfValueDefinition,
        traceSink?: IDamlLfTraceSink,
    ): IDamlLfRuntimeValue {
        const frame = this.createFrame(definition);

        return this.evaluateExpressionOrThrow(
            definition.expression,
            frame,
            traceSink,
        );
    }

    public evaluateReplayEntrypointOrThrow(
        definition: DamlLfValueDefinition,
        environment: IDamlLfReplayEnvironment,
        traceSink?: IDamlLfTraceSink,
    ): IDamlLfReplayEvaluationResult {
        const frame = this.createFrame(definition);
        const replayExpression =
            environment.entrypointExpression ?? definition.expression;
        const replayContext: IActiveReplayContext = {
            environment,
            effects: [],
            createdContracts: new Map(),
            nextSyntheticContractIdNumber: 1,
        };

        this.activeReplayContext = replayContext;

        try {
            const shouldEmitFallbackEffects =
                !this.isUpdateDrivenEntrypointExpression(replayExpression);

            if (shouldEmitFallbackEffects) {
                for (const effect of this.createReplayEffects(environment)) {
                    replayContext.effects.push(effect);
                    traceSink?.onStep({
                        kind: DamlLfStepKind.stateEffect,
                        expression: replayExpression,
                        frame,
                        locals: frame.scope.snapshotBindings(),
                        stateEffect: effect,
                    });
                }
            }

            return {
                value: this.evaluateReplayExpressionOrThrow(
                    replayExpression,
                    frame,
                    environment,
                    traceSink,
                ),
                effects: [...replayContext.effects],
            };
        }

        finally {
            this.activeReplayContext = undefined;
        }
    }

    private evaluateExpressionOrThrow(
        expression: DamlLfExpression,
        frame: DamlLfRuntimeFrame,
        traceSink?: IDamlLfTraceSink,
    ): IDamlLfRuntimeValue {
        traceSink?.onStep({
            kind: DamlLfStepKind.enterExpression,
            expression,
            frame,
            locals: frame.scope.snapshotBindings(),
        });

        const value = this.resolveExpressionValue(expression, frame, traceSink);

        traceSink?.onStep({
            kind: DamlLfStepKind.exitExpression,
            expression,
            frame,
            locals: frame.scope.snapshotBindings(),
            value,
        });

        return value;
    }

    private createReplayEffects(
        environment: IDamlLfReplayEnvironment,
    ): readonly IDamlLfReplayEffect[] {
        if (environment.entrypoint.kind === "exercise") {
            return [
                {
                    kind: "exercise",
                    contractId: environment.entrypoint.contractId,
                    templateId: environment.entrypoint.templateId,
                    choice: environment.entrypoint.choice,
                    argument: environment.entrypoint.argument,
                },
            ];
        }

        return [
            {
                kind: "create",
                templateId: environment.entrypoint.templateId,
                payload: environment.entrypoint.argument,
            },
        ];
    }

    private createFrame(
        definition: DamlLfValueDefinition,
        identityOverride?: {
            readonly packageId: string;
            readonly moduleName: string;
        },
    ): DamlLfRuntimeFrame {
        const identity =
            identityOverride
            ?? this.compilation.getValueDefinitionIdentityOrThrow(definition);

        return new DamlLfRuntimeFrame({
            frameId: `frame-${this.nextFrameNumber++}`,
            packageId: identity.packageId,
            moduleName: identity.moduleName,
            definition,
            scope: new DamlLfLexicalScope(),
        });
    }

    private resolveExpressionValue(
        expression: DamlLfExpression,
        frame: DamlLfRuntimeFrame,
        traceSink?: IDamlLfTraceSink,
    ): IDamlLfRuntimeValue {
        if (expression.textLiteral !== undefined) {
            return {
                kind: "text",
                value: expression.textLiteral,
            } satisfies ITextRuntimeValue;
        }

        if (expression.int64Literal !== undefined) {
            return {
                kind: "int64",
                value: expression.int64Literal,
            } satisfies IInt64RuntimeValue;
        }

        if (expression.variableName !== undefined) {
            const value = frame.scope.getBinding(expression.variableName);

            if (value === undefined) {
                throw new ValidationError(
                    `daml lf variable '${expression.variableName}' is not bound`,
                );
            }

            return value;
        }

        if (expression.builtinConstructor !== undefined) {
            switch (expression.builtinConstructor) {
                case "true":
                    return {
                        kind: "boolean",
                        value: true,
                    } satisfies IBooleanRuntimeValue;
                case "false":
                    return {
                        kind: "boolean",
                        value: false,
                    } satisfies IBooleanRuntimeValue;
                default:
                    return {
                        kind: "unit",
                    } satisfies IUnitRuntimeValue;
            }
        }

        if (expression.builtinFunction !== undefined) {
            return {
                kind: "builtin",
                builtinFunction: expression.builtinFunction,
                appliedArguments: [],
            } satisfies IBuiltinRuntimeValue;
        }

        if (expression.lambda !== undefined) {
            return {
                kind: "closure",
                parameters: expression.lambda.parameters,
                body: expression.lambda.body,
                frame,
            } satisfies IClosureRuntimeValue;
        }

        if (expression.application !== undefined) {
            const functionValue = this.evaluateExpressionOrThrow(
                expression.application.function,
                frame,
                traceSink,
            );
            const argumentValues = expression.application.arguments.map((argument) =>
                this.evaluateExpressionOrThrow(argument, frame, traceSink),
            );

            return this.applyFunctionOrThrow(
                functionValue,
                argumentValues,
                traceSink,
            );
        }

        if (expression.letExpression !== undefined) {
            const scopedFrame = this.deriveFrame(
                frame,
                frame.scope.createChild(),
            );

            for (const binding of expression.letExpression.bindings) {
                const boundValue = this.evaluateExpressionOrThrow(
                    binding.value,
                    scopedFrame,
                    traceSink,
                );

                scopedFrame.scope.setBinding(binding.name, boundValue);
            }

            return this.evaluateExpressionOrThrow(
                expression.letExpression.body,
                scopedFrame,
                traceSink,
            );
        }

        if (expression.recordConstruction !== undefined) {
            return this.createRecordRuntimeValue(
                Object.fromEntries(
                    expression.recordConstruction.fields.map((field) => [
                        field.name,
                        this.evaluateExpressionOrThrow(
                            field.value,
                            frame,
                            traceSink,
                        ),
                    ]),
                ),
            );
        }

        if (expression.recordProjection !== undefined) {
            const recordValue = this.evaluateExpressionOrThrow(
                expression.recordProjection.record,
                frame,
                traceSink,
            );

            if (recordValue.kind === "record") {
                const recordFields = (recordValue as IRecordRuntimeValue).fields;
                const fieldValue =
                    recordFields[expression.recordProjection.fieldName];

                if (fieldValue === undefined) {
                    throw new ValidationError(
                        `daml lf record projection could not find field '${expression.recordProjection.fieldName}'`,
                    );
                }

                return fieldValue;
            }

            const rawValue = this.unwrapRuntimeValue(recordValue);

            if (
                rawValue === null
                || typeof rawValue !== "object"
                || Array.isArray(rawValue)
            ) {
                throw new ValidationError(
                    `daml lf record projection requires an object value for field '${expression.recordProjection.fieldName}'`,
                );
            }

            return this.hydrateRuntimeValue(
                this.readLedgerRecordField(
                    rawValue as Record<string, unknown>,
                    expression.recordProjection.fieldName,
                ),
            );
        }

        if (expression.recordUpdate !== undefined) {
            const recordValue = this.evaluateExpressionOrThrow(
                expression.recordUpdate.record,
                frame,
                traceSink,
            );

            if (recordValue.kind === "record") {
                const recordFields = (recordValue as IRecordRuntimeValue).fields;

                return this.createRecordRuntimeValue({
                    ...recordFields,
                    [expression.recordUpdate.fieldName]:
                        this.evaluateExpressionOrThrow(
                            expression.recordUpdate.value,
                            frame,
                            traceSink,
                        ),
                });
            }

            const rawValue = this.unwrapRuntimeValue(recordValue);

            if (
                rawValue === null
                || typeof rawValue !== "object"
                || Array.isArray(rawValue)
            ) {
                throw new ValidationError(
                    `daml lf record update requires an object value for field '${expression.recordUpdate.fieldName}'`,
                );
            }

            return this.hydrateRuntimeValue({
                ...(rawValue as Record<string, unknown>),
                ...this.createLedgerRecordFieldUpdate(
                    rawValue as Record<string, unknown>,
                    expression.recordUpdate.fieldName,
                    this.unwrapRuntimeValue(
                        this.evaluateExpressionOrThrow(
                            expression.recordUpdate.value,
                            frame,
                            traceSink,
                        ),
                    ),
                ),
            });
        }

        if (expression.variantConstruction !== undefined) {
            return this.hydrateRuntimeValue({
                constructor: expression.variantConstruction.constructorName,
                value: this.unwrapRuntimeValue(
                    this.evaluateExpressionOrThrow(
                        expression.variantConstruction.argument,
                        frame,
                        traceSink,
                    ),
                ),
            });
        }

        if (expression.optionalConstruction !== undefined) {
            return expression.optionalConstruction.value === undefined
                ? ({
                    kind: "unit",
                } satisfies IUnitRuntimeValue)
                : this.evaluateExpressionOrThrow(
                    expression.optionalConstruction.value,
                    frame,
                    traceSink,
                );
        }

        if (expression.enumConstruction !== undefined) {
            return this.hydrateRuntimeValue(
                expression.enumConstruction.constructorName,
            );
        }

        if (expression.listConstruction !== undefined) {
            const front = expression.listConstruction.front.map((item) =>
                this.unwrapRuntimeValue(
                    this.evaluateExpressionOrThrow(item, frame, traceSink),
                ),
            );
            const tail =
                expression.listConstruction.tail === undefined
                    ? []
                    : this.unwrapRuntimeValue(
                        this.evaluateExpressionOrThrow(
                            expression.listConstruction.tail,
                            frame,
                            traceSink,
                        ),
                    );

            if (!Array.isArray(tail)) {
                throw new ValidationError(
                    "daml lf list construction requires an array tail",
                );
            }

            return this.hydrateRuntimeValue([...front, ...tail]);
        }

        if (expression.updateExpression !== undefined) {
            return this.evaluateUpdateExpressionOrThrow(
                expression,
                frame,
                traceSink,
            );
        }

        if (expression.caseExpression !== undefined) {
            const scrutinee = this.evaluateExpressionOrThrow(
                expression.caseExpression.scrutinee,
                frame,
                traceSink,
            );
            const matchingAlternative =
                expression.caseExpression.alternatives.find((alternative) =>
                    this.matchesCaseAlternative(alternative, scrutinee),
                );

            if (matchingAlternative === undefined) {
                const scrutineeDescription =
                    scrutinee.kind === "builtin"
                        ? `${String(scrutinee.builtinFunction)}(${(
                            scrutinee.appliedArguments as readonly IDamlLfRuntimeValue[]
                        )
                            .map((argument) => argument.kind)
                            .join(", ")})`
                        : scrutinee.kind;

                throw new ValidationError(
                    `daml lf case expression in '${frame.definition.name}' did not match any alternative for '${scrutineeDescription}' across [${expression.caseExpression.alternatives
                        .map((alternative) => alternative.patternKind)
                        .join(", ")}]`,
                );
            }

            if (
                (matchingAlternative.patternKind === "variant"
                    || matchingAlternative.patternKind === "optionalSome"
                    || matchingAlternative.patternKind === "cons")
            ) {
                const rawValue = this.unwrapRuntimeValue(scrutinee);

                if (
                    matchingAlternative.patternKind === "optionalSome"
                    || matchingAlternative.patternKind === "cons"
                    || (
                        rawValue !== null
                        && typeof rawValue === "object"
                        && "value" in rawValue
                    )
                ) {
                    const scopedFrame = this.deriveFrame(
                        frame,
                        frame.scope.createChild(),
                    );
                    if (
                        matchingAlternative.patternKind === "cons"
                        && Array.isArray(rawValue)
                    ) {
                        if (matchingAlternative.headBinderName !== undefined) {
                            scopedFrame.scope.setBinding(
                                matchingAlternative.headBinderName,
                                this.hydrateRuntimeValue(rawValue[0]),
                            );
                        }

                        if (matchingAlternative.tailBinderName !== undefined) {
                            scopedFrame.scope.setBinding(
                                matchingAlternative.tailBinderName,
                                this.hydrateRuntimeValue(rawValue.slice(1)),
                            );
                        }
                    }

                    else if (matchingAlternative.binderName !== undefined) {
                        scopedFrame.scope.setBinding(
                            matchingAlternative.binderName,
                            this.hydrateRuntimeValue(
                                matchingAlternative.patternKind === "optionalSome"
                                    ? rawValue
                                    : (rawValue as { value: unknown }).value,
                            ),
                        );
                    }

                    return this.evaluateExpressionOrThrow(
                        matchingAlternative.body,
                        scopedFrame,
                        traceSink,
                    );
                }
            }

            return this.evaluateExpressionOrThrow(
                matchingAlternative.body,
                frame,
                traceSink,
            );
        }

        if (expression.valueReference !== undefined) {
            const definition = this.compilation.getValueDefinitionOrThrow(
                expression.valueReference.packageId,
                expression.valueReference.moduleName,
                expression.valueReference.definitionName,
            );
            const frame = this.createFrame(definition);

            traceSink?.onStep({
                kind: DamlLfStepKind.call,
                expression,
                frame,
                locals: frame.scope.snapshotBindings(),
            });

            const value = this.evaluateExpressionOrThrow(
                definition.expression,
                frame,
                traceSink,
            );

            traceSink?.onStep({
                kind: DamlLfStepKind.return,
                expression,
                frame,
                locals: frame.scope.snapshotBindings(),
                value,
            });

            return value;
        }

        throw new ValidationError(
            expression.unsupportedNodeKind === undefined
                ? "daml lf expression is not supported yet"
                : `daml lf expression '${expression.unsupportedNodeKind}' is not supported yet`,
        );
    }

    private evaluateReplayExpressionOrThrow(
        expression: DamlLfExpression,
        frame: DamlLfRuntimeFrame,
        environment: IDamlLfReplayEnvironment,
        traceSink?: IDamlLfTraceSink,
    ): IDamlLfRuntimeValue {
        return this.evaluateReplayLambdaOrExpressionOrThrow(
            expression,
            frame,
            this.resolveEntrypointBindingValues(environment),
            traceSink,
            environment.entrypointBindingMode ?? "standard",
        );
    }

    private evaluateUpdateExpressionOrThrow(
        expression: DamlLfExpression,
        frame: DamlLfRuntimeFrame,
        traceSink?: IDamlLfTraceSink,
    ): IDamlLfRuntimeValue {
        const updateExpression = expression.updateExpression;

        if (updateExpression === undefined) {
            throw new ValidationError("daml lf update expression is missing");
        }

        switch (updateExpression.kind) {
            case "pure":
            case "embedExpr":
                return this.evaluateExpressionOrThrow(
                    updateExpression.expression ?? new DamlLfExpression({}),
                    frame,
                    traceSink,
                );
            case "block": {
                const scopedFrame = this.deriveFrame(
                    frame,
                    frame.scope.createChild(),
                );

                for (const binding of updateExpression.bindings ?? []) {
                    const boundValue = this.evaluateExpressionOrThrow(
                        binding.value,
                        scopedFrame,
                        traceSink,
                    );
                    scopedFrame.scope.setBinding(binding.name, boundValue);
                }

                return this.evaluateExpressionOrThrow(
                    updateExpression.body ?? new DamlLfExpression({}),
                    scopedFrame,
                    traceSink,
                );
            }
            case "create": {
                const payload = this.normalizeSemanticRecordValue(
                    this.unwrapRuntimeValue(
                        this.evaluateExpressionOrThrow(
                            updateExpression.argument ?? new DamlLfExpression({}),
                            frame,
                            traceSink,
                        ),
                    ),
                    updateExpression.templateId === undefined
                        ? undefined
                        : new TypeConReference({
                            packageId: updateExpression.templateId.packageId,
                            moduleName: updateExpression.templateId.moduleName,
                            name: updateExpression.templateId.templateName,
                        }),
                );
                const nextSyntheticContractIdNumber =
                    this.activeReplayContext?.nextSyntheticContractIdNumber ?? 1;
                const contractId = `created-${nextSyntheticContractIdNumber}`;

                if (this.activeReplayContext !== undefined) {
                    this.activeReplayContext.nextSyntheticContractIdNumber =
                        nextSyntheticContractIdNumber + 1;
                }

                this.activeReplayContext?.createdContracts.set(contractId, payload);
                this.emitReplayEffect(
                    {
                        kind: "create",
                        templateId:
                            updateExpression.templateId === undefined
                                ? undefined
                                : {
                                    packageId: updateExpression.templateId.packageId,
                                    moduleName: updateExpression.templateId.moduleName,
                                    entityName: updateExpression.templateId.templateName,
                                },
                        payload,
                    },
                    expression,
                    frame,
                    traceSink,
                );

                return {
                    kind: "contractId",
                    value: contractId,
                } satisfies IContractIdRuntimeValue;
            }
            case "fetch": {
                const contractId = this.readContractId(
                    this.evaluateExpressionOrThrow(
                        updateExpression.contractId ?? new DamlLfExpression({}),
                        frame,
                        traceSink,
                    ),
                );
                const payload =
                    this.activeReplayContext?.createdContracts.get(contractId)
                    ?? this.activeReplayContext?.environment.contracts?.get(contractId)
                        ?.payload;

                this.emitReplayEffect(
                    {
                        kind: "fetch",
                        contractId,
                        templateId:
                            updateExpression.templateId === undefined
                                ? undefined
                                : {
                                    packageId: updateExpression.templateId.packageId,
                                    moduleName: updateExpression.templateId.moduleName,
                                    entityName: updateExpression.templateId.templateName,
                                },
                    },
                    expression,
                    frame,
                    traceSink,
                );

                return this.hydrateRuntimeValue(payload);
            }
            case "exercise": {
                if (
                    updateExpression.templateId === undefined
                    || updateExpression.choiceName === undefined
                ) {
                    throw new ValidationError(
                        "daml lf exercise update is missing its template or choice",
                    );
                }

                const contractId = this.readContractId(
                    this.evaluateExpressionOrThrow(
                        updateExpression.contractId ?? new DamlLfExpression({}),
                        frame,
                        traceSink,
                    ),
                );
                const argument = this.unwrapRuntimeValue(
                    this.evaluateExpressionOrThrow(
                        updateExpression.argument ?? new DamlLfExpression({}),
                        frame,
                        traceSink,
                    ),
                );
                const payload =
                    this.activeReplayContext?.createdContracts.get(contractId)
                    ?? this.activeReplayContext?.environment.contracts?.get(contractId)
                        ?.payload;

                if (payload === undefined) {
                    throw new ValidationError(
                        `daml lf exercise update could not hydrate contract '${contractId}'`,
                    );
                }

                this.emitReplayEffect(
                    {
                        kind: "exercise",
                        contractId,
                        templateId: this.toReplayTemplateId(
                            updateExpression.templateId,
                        ),
                        choice: updateExpression.choiceName,
                        argument,
                    },
                    expression,
                    frame,
                    traceSink,
                );

                const resolvedDefinition = this.activeReplayContext
                    ?.environment.definitionResolver
                    ?.resolveChoiceDefinitionOrThrow?.(
                        new DamlLfTemplateId(updateExpression.templateId),
                        updateExpression.choiceName,
                    );

                if (resolvedDefinition === undefined) {
                    throw new ValidationError(
                        "daml lf exercise update requires a replay definition resolver",
                    );
                }

                return this.evaluateReplayLambdaOrExpressionOrThrow(
                    resolvedDefinition.replayExpression,
                    this.createFrame(
                        resolvedDefinition.definition,
                        resolvedDefinition.frameIdentity,
                    ),
                    [
                        {
                            value: payload,
                            contractId,
                        },
                        {
                            value: argument,
                        },
                    ],
                    traceSink,
                    resolvedDefinition.replayBindingMode,
                );
            }
            default:
                throw new ValidationError(
                    `daml lf update expression '${updateExpression.kind}' is not supported yet`,
                );
        }
    }

    private resolveEntrypointBindingValues(
        environment: IDamlLfReplayEnvironment,
    ): readonly IReplayBindingValue[] {
        if (environment.entrypoint.kind === "create") {
            return environment.entrypoint.argument === undefined
                ? []
                : [{ value: environment.entrypoint.argument }];
        }

        const contractPayload =
            environment.entrypoint.contractId === undefined
                ? undefined
                : environment.contracts?.get(environment.entrypoint.contractId)?.payload;

        const bindingValues: IReplayBindingValue[] = [];

        if (contractPayload !== undefined) {
            bindingValues.push({
                value: contractPayload,
                contractId: environment.entrypoint.contractId,
            });
        }

        if (environment.entrypoint.argument !== undefined) {
            bindingValues.push({
                value: environment.entrypoint.argument,
            });
        }

        return bindingValues;
    }

    private evaluateReplayLambdaOrExpressionOrThrow(
        expression: DamlLfExpression,
        frame: DamlLfRuntimeFrame,
        bindingValues: readonly IReplayBindingValue[],
        traceSink?: IDamlLfTraceSink,
        bindingMode:
            | "standard"
            | "createWrapper"
            | "exerciseWrapper"
            | "templateChoice" = "standard",
    ): IDamlLfRuntimeValue {
        if (expression.lambda === undefined) {
            return this.evaluateExpressionOrThrow(expression, frame, traceSink);
        }

        const scopedFrame = this.deriveFrame(
            frame,
            frame.scope.createChild(),
        );

        if (bindingMode === "templateChoice") {
            const selfParameterName = expression.lambda.parameters[0];
            const thisParameterName = expression.lambda.parameters[1];
            const argumentParameterName = expression.lambda.parameters[2];
            const contractId = bindingValues[0]?.contractId;
            const payload = bindingValues[0];
            const argument = bindingValues[1];

            if (selfParameterName !== undefined && contractId !== undefined) {
                scopedFrame.scope.setBinding(selfParameterName, {
                    kind: "contractId",
                    value: contractId,
                } satisfies IContractIdRuntimeValue);
            }

            if (thisParameterName !== undefined && payload !== undefined) {
                scopedFrame.scope.setBinding(
                    thisParameterName,
                    this.hydrateRuntimeValue(
                        payload.value,
                        payload.contractId,
                    ),
                );
            }

            if (argumentParameterName !== undefined && argument !== undefined) {
                scopedFrame.scope.setBinding(
                    argumentParameterName,
                    this.hydrateRuntimeValue(
                        argument.value,
                        argument.contractId,
                    ),
                );
            }
        }

        else if (bindingMode === "exerciseWrapper") {
            const thisParameterName = expression.lambda.parameters.at(-2);
            const argumentParameterName = expression.lambda.parameters.at(-1);
            const contractId = bindingValues[0]?.contractId;

            if (thisParameterName !== undefined && contractId !== undefined) {
                scopedFrame.scope.setBinding(thisParameterName, {
                    kind: "contractId",
                    value: contractId,
                } satisfies IContractIdRuntimeValue);
            }

            if (argumentParameterName !== undefined && bindingValues[1] !== undefined) {
                scopedFrame.scope.setBinding(
                    argumentParameterName,
                    this.hydrateRuntimeValue(
                        bindingValues[1].value,
                        bindingValues[1].contractId,
                    ),
                );
            }
        }

        else if (bindingMode === "createWrapper") {
            const argumentParameterName = expression.lambda.parameters.at(-1);
            const bindingValue = bindingValues[0];

            if (argumentParameterName !== undefined && bindingValue !== undefined) {
                scopedFrame.scope.setBinding(
                    argumentParameterName,
                    this.hydrateRuntimeValue(
                        bindingValue.value,
                        bindingValue.contractId,
                    ),
                );
            }
        }

        else {
            for (
                let index = 0;
                index < expression.lambda.parameters.length;
                index += 1
            ) {
                const bindingValue = bindingValues[index];

                if (bindingValue === undefined) {
                    break;
                }

                scopedFrame.scope.setBinding(
                    expression.lambda.parameters[index]!,
                    this.hydrateRuntimeValue(
                        bindingValue.value,
                        bindingValue.contractId,
                    ),
                );
            }
        }

        return this.evaluateExpressionOrThrow(
            expression.lambda.body,
            scopedFrame,
            traceSink,
        );
    }

    private hydrateRuntimeValue(
        value: unknown,
        contractId?: string,
    ): IDamlLfRuntimeValue {
        if (value === undefined || value === null) {
            return {
                kind: "unit",
            } satisfies IUnitRuntimeValue;
        }

        const embeddedContractId = this.readEmbeddedContractId(value);

        if (embeddedContractId !== undefined) {
            return {
                kind: "contractId",
                value: embeddedContractId,
            } satisfies IContractIdRuntimeValue;
        }

        if (typeof value === "string") {
            return {
                kind: "text",
                value,
            } satisfies ITextRuntimeValue;
        }

        if (typeof value === "boolean") {
            return {
                kind: "boolean",
                value,
            } satisfies IBooleanRuntimeValue;
        }

        return {
            kind: "ledgerValue",
            value,
            contractId,
        } satisfies ILedgerValueRuntimeValue;
    }

    private createRecordRuntimeValue(
        fields: Readonly<Record<string, IDamlLfRuntimeValue>>,
    ): IDamlLfRuntimeValue {
        return this.canProjectRecordAsLedgerValue(fields)
            ? this.hydrateRuntimeValue(
                Object.fromEntries(
                    Object.entries(fields).map(([name, value]) => [
                        name,
                        this.unwrapRuntimeValue(value),
                    ]),
                ),
            )
            : ({
                kind: "record",
                fields,
            } satisfies IRecordRuntimeValue);
    }

    private canProjectRecordAsLedgerValue(
        fields: Readonly<Record<string, IDamlLfRuntimeValue>>,
    ): boolean {
        return Object.values(fields).every((value) => {
            if (value.kind === "record") {
                return this.canProjectRecordAsLedgerValue(
                    (value as IRecordRuntimeValue).fields,
                );
            }

            return value.kind !== "closure" && value.kind !== "builtin";
        });
    }

    private readEmbeddedContractId(value: unknown): string | undefined {
        if (
            value !== null
            && typeof value === "object"
            && DAML_LF_CONTRACT_ID_MARKER_KEY in value
            && typeof value[DAML_LF_CONTRACT_ID_MARKER_KEY] === "string"
        ) {
            return value[DAML_LF_CONTRACT_ID_MARKER_KEY];
        }

        if (
            value !== null
            && typeof value === "object"
            && "sum" in value
            && value.sum !== null
            && typeof value.sum === "object"
            && "oneofKind" in value.sum
            && value.sum.oneofKind === "contractId"
            && "contractId" in value.sum
            && typeof value.sum.contractId === "string"
        ) {
            return value.sum.contractId;
        }

        return undefined;
    }

    private readLedgerRecordField(
        rawValue: Readonly<Record<string, unknown>>,
        fieldName: string,
    ): unknown {
        if (fieldName in rawValue) {
            return rawValue[fieldName];
        }

        const semanticField = this.resolveSemanticRecordField(
            rawValue,
            fieldName,
        );

        if (semanticField === undefined) {
            return undefined;
        }

        return this.attachSemanticRecordId(
            rawValue[String(semanticField.index)],
            semanticField.typeConReference,
        );
    }

    private createLedgerRecordFieldUpdate(
        rawValue: Readonly<Record<string, unknown>>,
        fieldName: string,
        nextValue: unknown,
    ): Record<string, unknown> {
        if (fieldName in rawValue) {
            return {
                [fieldName]: nextValue,
            };
        }

        const semanticField = this.resolveSemanticRecordField(
            rawValue,
            fieldName,
        );

        return semanticField === undefined
            ? {
                [fieldName]: nextValue,
            }
            : {
                [String(semanticField.index)]: nextValue,
            };
    }

    private resolveSemanticRecordField(
        rawValue: Readonly<Record<string, unknown>>,
        fieldName: string,
    ): {
        index: number;
        typeConReference?: TypeConReference;
    } | undefined {
        const recordId = rawValue[DAML_LF_RECORD_ID_MARKER_KEY];

        if (
            recordId === undefined
            || recordId === null
            || typeof recordId !== "object"
        ) {
            return undefined;
        }

        const typedRecordId = recordId as {
            packageId?: unknown;
            moduleName?: unknown;
            entityName?: unknown;
        };
        const reference = new TypeConReference({
            packageId:
                typeof typedRecordId.packageId === "string"
                    ? typedRecordId.packageId
                    : "",
            moduleName:
                typeof typedRecordId.moduleName === "string"
                    ? typedRecordId.moduleName
                    : "",
            name:
                typeof typedRecordId.entityName === "string"
                    ? typedRecordId.entityName
                    : "",
        });

        try {
            const fields = this.semanticModel.getRecordFieldsOrThrow(reference);
            const semanticIndex = fields.findIndex(
                (field) => field.name === fieldName,
            );

            if (semanticIndex < 0) {
                return undefined;
            }

            return {
                index: semanticIndex,
                typeConReference: fields[semanticIndex]?.type.typeConReference,
            };
        } catch {
            return undefined;
        }
    }

    private attachSemanticRecordId(
        value: unknown,
        typeConReference?: TypeConReference,
    ): unknown {
        if (
            typeConReference === undefined
            || value === null
            || value === undefined
            || typeof value !== "object"
            || Array.isArray(value)
            || DAML_LF_RECORD_ID_MARKER_KEY in value
        ) {
            return value;
        }

        return {
            ...(value as Record<string, unknown>),
            [DAML_LF_RECORD_ID_MARKER_KEY]: {
                packageId: typeConReference.packageId,
                moduleName: typeConReference.moduleName,
                entityName: typeConReference.name,
            },
        };
    }

    private normalizeSemanticRecordValue(
        value: unknown,
        typeConReference?: TypeConReference,
    ): unknown {
        if (
            typeConReference === undefined
            || value === null
            || value === undefined
            || typeof value !== "object"
            || Array.isArray(value)
        ) {
            return value;
        }

        try {
            const fields = this.semanticModel.getRecordFieldsOrThrow(typeConReference);
            const rawValue = value as Record<string, unknown>;
            const normalizedValue: Record<string, unknown> = {};
            const consumedKeys = new Set<string>();

            for (const [index, field] of fields.entries()) {
                const directValue = rawValue[field.name];
                const positionalKey = String(index);
                const positionalValue = rawValue[positionalKey];
                const nextValue =
                    directValue !== undefined ? directValue : positionalValue;

                if (nextValue === undefined) {
                    continue;
                }

                normalizedValue[field.name] = this.normalizeSemanticRecordValue(
                    nextValue,
                    field.type.typeConReference,
                );
                consumedKeys.add(field.name);
                consumedKeys.add(positionalKey);
            }

            for (const [key, item] of Object.entries(rawValue)) {
                if (!consumedKeys.has(key)) {
                    normalizedValue[key] = item;
                }
            }

            return normalizedValue;
        } catch {
            return value;
        }
    }

    private toReplayTemplateId(templateId: {
        readonly packageId: string;
        readonly moduleName: string;
        readonly templateName: string;
    } | undefined): IDamlLfReplayEffect["templateId"] {
        return templateId === undefined
            ? undefined
            : {
                packageId: templateId.packageId,
                moduleName: templateId.moduleName,
                entityName: templateId.templateName,
            };
    }

    private readContractId(value: IDamlLfRuntimeValue): string {
        if (
            (value.kind === "contractId" || value.kind === "text")
            && "value" in value
            && typeof value.value === "string"
        ) {
            return value.value;
        }

        if (
            value.kind === "ledgerValue"
            && "contractId" in value
            && typeof value.contractId === "string"
        ) {
            return value.contractId;
        }

        throw new ValidationError(
            `daml lf expected a contract id-compatible value, got '${value.kind}'`,
        );
    }

    private unwrapRuntimeValue(value: IDamlLfRuntimeValue): unknown {
        if (value.kind === "record") {
            const recordFields = (value as IRecordRuntimeValue).fields;

            return Object.fromEntries(
                Object.entries(recordFields).map(([name, fieldValue]) => [
                    name,
                    this.unwrapRuntimeValue(fieldValue as IDamlLfRuntimeValue),
                ]),
            );
        }

        if ("value" in value) {
            return value.value;
        }

        if (value.kind === "unit") {
            return null;
        }

        return value.kind;
    }

    private readRuntimeListOrThrow(
        value: IDamlLfRuntimeValue,
    ): readonly IDamlLfRuntimeValue[] {
        if (
            value.kind === "ledgerValue"
            && "value" in value
            && Array.isArray(value.value)
        ) {
            return value.value.map((item) => this.hydrateRuntimeValue(item));
        }

        throw new ValidationError(
            `daml lf expected a list-compatible value, got '${value.kind}'`,
        );
    }

    private matchesBuiltinConstructor(
        builtinConstructor: DamlLfExpression["builtinConstructor"],
        runtimeValue: IDamlLfRuntimeValue,
    ): boolean {
        switch (builtinConstructor) {
            case "true":
                return runtimeValue.kind === "boolean" && runtimeValue.value === true;
            case "false":
                return runtimeValue.kind === "boolean" && runtimeValue.value === false;
            case "unit":
                return runtimeValue.kind === "unit";
            default:
                return false;
        }
    }

    private matchesCaseAlternative(
        alternative: NonNullable<DamlLfExpression["caseExpression"]>["alternatives"][number],
        runtimeValue: IDamlLfRuntimeValue,
    ): boolean {
        if (alternative.patternKind === "default") {
            return true;
        }

        if (alternative.patternKind === "builtinCon") {
            return this.matchesBuiltinConstructor(
                alternative.builtinConstructor,
                runtimeValue,
            );
        }

        if (alternative.patternKind === "optionalNone") {
            return runtimeValue.kind === "unit";
        }

        if (alternative.patternKind === "optionalSome") {
            return runtimeValue.kind !== "unit";
        }

        if (alternative.patternKind === "enum") {
            return (
                runtimeValue.kind === "text"
                && runtimeValue.value === alternative.constructorName
            );
        }

        if (alternative.patternKind === "nil") {
            const unwrapped = this.unwrapRuntimeValue(runtimeValue);
            return Array.isArray(unwrapped) && unwrapped.length === 0;
        }

        if (alternative.patternKind === "cons") {
            const unwrapped = this.unwrapRuntimeValue(runtimeValue);
            return Array.isArray(unwrapped) && unwrapped.length > 0;
        }

        const rawValue = this.unwrapRuntimeValue(runtimeValue);

        return (
            rawValue !== null
            && typeof rawValue === "object"
            && "constructor" in rawValue
            && (rawValue as { constructor?: unknown }).constructor
                === alternative.constructorName
        );
    }

    private emitReplayEffect(
        effect: IDamlLfReplayEffect,
        expression: DamlLfExpression,
        frame: DamlLfRuntimeFrame,
        traceSink?: IDamlLfTraceSink,
    ): void {
        this.activeReplayContext?.effects.push(effect);
        traceSink?.onStep({
            kind: DamlLfStepKind.stateEffect,
            expression,
            frame,
            locals: frame.scope.snapshotBindings(),
            stateEffect: effect,
        });
    }

    private isUpdateDrivenEntrypointExpression(
        expression: DamlLfExpression,
    ): boolean {
        if (expression.updateExpression !== undefined) {
            return true;
        }

        if (expression.lambda !== undefined) {
            return this.isUpdateDrivenEntrypointExpression(expression.lambda.body);
        }

        if (expression.letExpression !== undefined) {
            return this.isUpdateDrivenEntrypointExpression(
                expression.letExpression.body,
            );
        }

        return false;
    }

    private applyFunctionOrThrow(
        functionValue: IDamlLfRuntimeValue,
        argumentValues: readonly IDamlLfRuntimeValue[],
        traceSink?: IDamlLfTraceSink,
    ): IDamlLfRuntimeValue {
        if (functionValue.kind !== "closure") {
            if (functionValue.kind === "builtin") {
                const builtinValue = functionValue as IBuiltinRuntimeValue;

                if (builtinValue.builtinFunction === "FOLDL") {
                    return this.applyFoldlBuiltinOrThrow(
                        builtinValue,
                        argumentValues,
                        traceSink,
                    );
                }

                return this.builtinDispatch.applyOrThrow(
                    builtinValue,
                    argumentValues,
                );
            }

            throw new ValidationError(
                `daml lf expression is not callable (${functionValue.kind})`,
            );
        }

        const closure = functionValue as IClosureRuntimeValue;
        const boundParameterCount = Math.min(
            closure.parameters.length,
            argumentValues.length,
        );
        const remainingParameters = closure.parameters.slice(boundParameterCount);
        const remainingArguments = argumentValues.slice(boundParameterCount);
        const scope = closure.frame.scope.createChild();

        for (let index = 0; index < boundParameterCount; index += 1) {
            scope.setBinding(closure.parameters[index]!, argumentValues[index]!);
        }

        const appliedFrame = this.deriveFrame(closure.frame, scope);

        const intermediateValue =
            remainingParameters.length === 0
                ? this.evaluateExpressionOrThrow(
                    closure.body,
                    appliedFrame,
                    traceSink,
                )
                : ({
                    kind: "closure",
                    parameters: remainingParameters,
                    body: closure.body,
                    frame: appliedFrame,
                } satisfies IClosureRuntimeValue);

        return remainingArguments.length === 0
            ? intermediateValue
            : this.applyFunctionOrThrow(
                intermediateValue,
                remainingArguments,
                traceSink,
            );
    }

    private applyFoldlBuiltinOrThrow(
        builtinValue: IBuiltinRuntimeValue,
        argumentValues: readonly IDamlLfRuntimeValue[],
        traceSink?: IDamlLfTraceSink,
    ): IDamlLfRuntimeValue {
        const appliedArguments = [
            ...builtinValue.appliedArguments,
            ...argumentValues,
        ];

        if (appliedArguments.length < 3) {
            return {
                kind: "builtin",
                builtinFunction: builtinValue.builtinFunction,
                appliedArguments,
            } satisfies IBuiltinRuntimeValue;
        }

        const foldFunction = appliedArguments[0]!;
        let accumulator = appliedArguments[1]!;
        const listItems = this.readRuntimeListOrThrow(appliedArguments[2]!);
        const remainingArguments = appliedArguments.slice(3);

        for (const item of listItems) {
            accumulator = this.applyFunctionOrThrow(
                this.applyFunctionOrThrow(
                    foldFunction,
                    [accumulator],
                    traceSink,
                ),
                [item],
                traceSink,
            );
        }

        return remainingArguments.length === 0
            ? accumulator
            : this.applyFunctionOrThrow(
                accumulator,
                remainingArguments,
                traceSink,
            );
    }

    private deriveFrame(
        frame: DamlLfRuntimeFrame,
        scope: DamlLfLexicalScope,
    ): DamlLfRuntimeFrame {
        return new DamlLfRuntimeFrame({
            frameId: frame.frameId,
            packageId: frame.packageId,
            moduleName: frame.moduleName,
            definition: frame.definition,
            scope,
        });
    }
}
