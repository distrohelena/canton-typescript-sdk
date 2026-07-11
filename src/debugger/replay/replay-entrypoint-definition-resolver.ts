import { DamlLfExpression } from "../../daml-lf/model/daml-lf-expression.js";
import { DamlLfType } from "../../daml-lf/model/daml-lf-type.js";
import { DamlLfValueDefinition } from "../../daml-lf/model/daml-lf-value-definition.js";
import { DamlLfTemplateId } from "../../daml-lf/model/daml-lf-template-id.js";
import { ReplaySourceMapException } from "../errors/replay-source-map.exception.js";
import { SourceIndexedCompilation } from "../source/source-indexed-compilation.js";
import { IndexedExecutableSource } from "../source/source-indexed-compilation.js";
import { ReplayEntrypoint } from "./replay-entrypoint.js";

export interface ResolvedReplayEntrypointDefinition {
    packageId: string;
    moduleName: string;
    definition: DamlLfValueDefinition;
    frameIdentity?: {
        packageId: string;
        moduleName: string;
    };
    replayExpression: DamlLfExpression;
    replayBindingMode:
        | "standard"
        | "createWrapper"
        | "exerciseWrapper"
        | "templateChoice";
}

export class ReplayEntrypointDefinitionResolver {
    public constructor(
        private readonly indexedCompilation: SourceIndexedCompilation,
    ) {}

    public resolveEntrypointDefinitionOrThrow(
        entrypoint: ReplayEntrypoint,
    ): ResolvedReplayEntrypointDefinition {
        const templateId = entrypoint.templateId;

        if (
            templateId?.packageId === undefined
            || templateId.moduleName === undefined
            || templateId.entityName === undefined
        ) {
            throw new ReplaySourceMapException(
                "replay entrypoint is missing template identity for source resolution",
            );
        }
        const packageId = templateId.packageId;
        const moduleName = templateId.moduleName;
        const templateName = templateId.entityName;

        const source =
            entrypoint.kind === "create"
                ? this.indexedCompilation
                    .getExecutableSources()
                    .find((candidate) =>
                        this.matchesTemplate(candidate, {
                            packageId,
                            moduleName,
                            templateName,
                        })
                        && candidate.entrypointKind === "create")
                : this.findExerciseSourceOrThrow(
                    new DamlLfTemplateId({
                        packageId,
                        moduleName,
                        templateName,
                    }),
                    entrypoint.choice,
                );

        if (source === undefined) {
            throw new ReplaySourceMapException(
                `missing executable metadata for replay entrypoint '${packageId}::${moduleName}::${templateName}'`,
            );
        }

        const definition =
            this.indexedCompilation.compilation.getValueDefinitionOrThrow(
                source.packageId,
                source.moduleName,
                source.definitionName,
            );

        return {
            packageId: source.packageId,
            moduleName: source.moduleName,
            definition,
            ...this.resolveReplayStrategy(
                definition.expression,
                source,
                entrypoint.kind,
                entrypoint.kind === "exercise"
                    ? new DamlLfTemplateId({
                        packageId,
                        moduleName,
                        templateName,
                    })
                    : undefined,
                entrypoint.choice,
            ),
        };
    }

    public resolveChoiceDefinitionOrThrow(
        templateId: DamlLfTemplateId,
        choiceName: string,
    ): ResolvedReplayEntrypointDefinition {
        const choiceReplayExpression = this.resolveChoiceReplayExpression(
            templateId,
            choiceName,
        );
        const source = this.findExerciseSource(templateId, choiceName);

        if (source === undefined) {
            if (choiceReplayExpression === undefined) {
                throw new ReplaySourceMapException(
                    `missing executable metadata for choice '${templateId.packageId}::${templateId.moduleName}::${templateId.templateName}::${choiceName}'`,
                );
            }

            return {
                packageId: templateId.packageId,
                moduleName: templateId.moduleName,
                definition: new DamlLfValueDefinition({
                    name: `${templateId.templateName}$${choiceName}`,
                    type: new DamlLfType({}),
                    expression: choiceReplayExpression,
                }),
                frameIdentity: {
                    packageId: templateId.packageId,
                    moduleName: templateId.moduleName,
                },
                replayExpression: choiceReplayExpression,
                replayBindingMode: "templateChoice",
            };
        }

        const definition =
            this.indexedCompilation.compilation.getValueDefinitionOrThrow(
                source.packageId,
                source.moduleName,
                source.definitionName,
            );

        return {
            packageId: source.packageId,
            moduleName: source.moduleName,
            definition,
            ...this.resolveChoiceReplayStrategy(
                definition.expression,
                choiceReplayExpression,
                source,
            ),
        };
    }

    private resolveReplayStrategy(
        expression: DamlLfExpression,
        source: IndexedExecutableSource,
        entrypointKind: "create" | "exercise",
        templateId?: DamlLfTemplateId,
        choiceName?: string,
    ): Pick<
        ResolvedReplayEntrypointDefinition,
        "replayExpression" | "replayBindingMode"
    > {
        if (
            entrypointKind === "exercise"
            && templateId !== undefined
            && choiceName !== undefined
        ) {
            const normalizedCurriedChoiceExpression =
                this.wrapChoiceArgumentEnvelope(
                    this.normalizeCurriedChoiceExpression(expression),
                    source.choiceArgumentFieldName,
                );

            if (normalizedCurriedChoiceExpression !== undefined) {
                return {
                    replayExpression: normalizedCurriedChoiceExpression,
                    replayBindingMode: "templateChoice",
                };
            }

            const choiceReplayExpression =
                this.resolveChoiceReplayExpression(
                    templateId,
                    choiceName,
                );

            if (
                choiceReplayExpression !== undefined
                && this.shouldPreferTemplateChoiceExpression(expression, source)
            ) {
                const replayExpression = this.wrapChoiceArgumentEnvelope(
                    choiceReplayExpression,
                    source.choiceArgumentFieldName,
                );

                return {
                    replayExpression: replayExpression ?? choiceReplayExpression,
                    replayBindingMode: "templateChoice",
                };
            }
        }

        return {
            replayExpression: this.unwrapReplayExpression(
                expression,
                entrypointKind,
            ),
            replayBindingMode: this.resolveReplayBindingMode(
                expression,
                entrypointKind,
            ),
        };
    }

    private resolveChoiceReplayExpression(
        templateId: DamlLfTemplateId,
        choiceName: string,
    ): DamlLfExpression | undefined {
        let choices;
        let templateParameterName;

        try {
            const template = this.indexedCompilation.compilation
                .getTemplates()
                .find((candidate) =>
                    candidate.templateId.packageId === templateId.packageId
                    && candidate.templateId.moduleName === templateId.moduleName
                    && candidate.templateId.templateName === templateId.templateName,
                );

            if (template === undefined) {
                return undefined;
            }

            choices = template.choices;
            templateParameterName = template.parameterName;
        }

        catch {
            return undefined;
        }

        const choice = choices.find((candidate) => candidate.name === choiceName);

        if (choice?.updateExpression === undefined) {
            return undefined;
        }

        return new DamlLfExpression({
            lambda: {
                parameters: [
                    choice.selfBinderName,
                    templateParameterName,
                    choice.parameter.name,
                ],
                body: choice.updateExpression,
            },
        });
    }

    private resolveChoiceReplayStrategy(
        expression: DamlLfExpression,
        choiceReplayExpression: DamlLfExpression | undefined,
        source: IndexedExecutableSource,
    ): Pick<
        ResolvedReplayEntrypointDefinition,
        "replayExpression" | "replayBindingMode"
    > {
        const normalizedCurriedChoiceExpression =
            this.wrapChoiceArgumentEnvelope(
                this.normalizeCurriedChoiceExpression(expression),
                source.choiceArgumentFieldName,
            );

        if (normalizedCurriedChoiceExpression !== undefined) {
            return {
                replayExpression: normalizedCurriedChoiceExpression,
                replayBindingMode: "templateChoice",
            };
        }

        if (
            choiceReplayExpression !== undefined
            && this.shouldPreferTemplateChoiceExpression(expression, source)
        ) {
            const replayExpression = this.wrapChoiceArgumentEnvelope(
                choiceReplayExpression,
                source.choiceArgumentFieldName,
            );

            return {
                replayExpression: replayExpression ?? choiceReplayExpression,
                replayBindingMode: "templateChoice",
            };
        }

        return {
            replayExpression: this.unwrapReplayExpression(
                expression,
                "exercise",
            ),
            replayBindingMode: this.resolveReplayBindingMode(
                expression,
                "exercise",
            ),
        };
    }

    private findExerciseSource(
        templateId: DamlLfTemplateId,
        choiceName: string | undefined,
    ) {
        return this.indexedCompilation
            .getExecutableSources()
            .find((candidate) =>
                this.matchesTemplate(candidate, templateId)
                && candidate.entrypointKind === "exercise"
                && candidate.choiceName === choiceName);
    }

    private findExerciseSourceOrThrow(
        templateId: DamlLfTemplateId,
        choiceName: string | undefined,
    ) {
        const source = this.findExerciseSource(templateId, choiceName);

        if (source !== undefined) {
            return source;
        }

        throw new ReplaySourceMapException(
            `missing executable metadata for choice '${templateId.packageId}::${templateId.moduleName}::${templateId.templateName}::${choiceName ?? "<unknown>"}'`,
        );
    }

    private matchesTemplate(
        candidate: {
            packageId: string;
            moduleName: string;
            templateName?: string;
        },
        templateId: {
            packageId: string;
            moduleName: string;
            templateName: string;
        },
    ): boolean {
        return (
            candidate.packageId === templateId.packageId
            && candidate.moduleName === templateId.moduleName
            && candidate.templateName === templateId.templateName
        );
    }

    private unwrapReplayExpression(
        expression: DamlLfExpression,
        entrypointKind: "create" | "exercise",
    ): DamlLfExpression {
        if (expression.recordConstruction === undefined) {
            return expression;
        }

        const wrapperFieldName =
            entrypointKind === "create" ? "m_create" : "m_exercise";
        const wrapperField = expression.recordConstruction.fields.find(
            (field) => field.name === wrapperFieldName,
        );

        return wrapperField?.value ?? expression;
    }

    private resolveReplayBindingMode(
        expression: DamlLfExpression,
        entrypointKind: "create" | "exercise",
    ): ResolvedReplayEntrypointDefinition["replayBindingMode"] {
        if (expression.recordConstruction === undefined) {
            return "standard";
        }

        const wrapperFieldName =
            entrypointKind === "create" ? "m_create" : "m_exercise";
        const wrapperField = expression.recordConstruction.fields.find(
            (field) => field.name === wrapperFieldName,
        );
        const parameters = wrapperField?.value.lambda?.parameters ?? [];

        if (
            entrypointKind === "exercise"
            && parameters.length >= 3
            && parameters.at(-2) === "this"
            && parameters.at(-1) === "arg"
        ) {
            return "exerciseWrapper";
        }

        if (
            entrypointKind === "create"
            && parameters.length >= 2
            && parameters.at(-1) === "arg"
        ) {
            return "createWrapper";
        }

        return "standard";
    }

    private shouldPreferTemplateChoiceExpression(
        expression: DamlLfExpression,
        source?: IndexedExecutableSource,
    ): boolean {
        return (
            expression.recordConstruction !== undefined
            && source?.choiceName !== "Archive"
        );
    }

    private normalizeCurriedChoiceExpression(
        expression: DamlLfExpression,
    ): DamlLfExpression | undefined {
        const outerParameterName = expression.lambda?.parameters[0];
        const trailingLambda = this.extractTrailingLambda(expression.lambda?.body);

        if (
            outerParameterName === undefined
            || expression.lambda?.parameters.length !== 1
            || trailingLambda === undefined
            || trailingLambda.parameters.length < 2
        ) {
            return undefined;
        }

        return new DamlLfExpression({
            lambda: {
                parameters: [
                    trailingLambda.parameters[0]!,
                    outerParameterName,
                    trailingLambda.parameters[1]!,
                ],
                body: trailingLambda.body,
            },
            sourceLocation: expression.sourceLocation,
        });
    }

    private wrapChoiceArgumentEnvelope(
        expression: DamlLfExpression | undefined,
        choiceArgumentFieldName: string | undefined,
    ): DamlLfExpression | undefined {
        if (
            expression === undefined
            || choiceArgumentFieldName === undefined
            || expression.lambda === undefined
            || expression.lambda.parameters.length < 3
        ) {
            return expression;
        }

        const argumentParameterName = expression.lambda.parameters[2]!;
        const envelopeParameterName = `__${argumentParameterName}Envelope`;

        return new DamlLfExpression({
            lambda: {
                parameters: [
                    expression.lambda.parameters[0]!,
                    expression.lambda.parameters[1]!,
                    envelopeParameterName,
                ],
                body: new DamlLfExpression({
                    letExpression: {
                        bindings: [
                            {
                                name: argumentParameterName,
                                value: new DamlLfExpression({
                                    recordProjection: {
                                        fieldName: choiceArgumentFieldName,
                                        record: new DamlLfExpression({
                                            variableName: envelopeParameterName,
                                        }),
                                    },
                                }),
                            },
                        ],
                        body: expression.lambda.body,
                    },
                    sourceLocation: expression.lambda.body.sourceLocation,
                }),
            },
            sourceLocation: expression.sourceLocation,
        });
    }

    private extractTrailingLambda(
        expression: DamlLfExpression | undefined,
    ): { parameters: readonly string[]; body: DamlLfExpression } | undefined {
        if (expression === undefined) {
            return undefined;
        }

        if (expression.lambda !== undefined) {
            return {
                parameters: expression.lambda.parameters,
                body: expression.lambda.body,
            };
        }

        if (expression.letExpression !== undefined) {
            const trailingLambda = this.extractTrailingLambda(
                expression.letExpression.body,
            );

            if (trailingLambda === undefined) {
                return undefined;
            }

            return {
                parameters: trailingLambda.parameters,
                body: new DamlLfExpression({
                    letExpression: {
                        bindings: expression.letExpression.bindings,
                        body: trailingLambda.body,
                    },
                    sourceLocation: expression.sourceLocation,
                }),
            };
        }

        return undefined;
    }
}
