import { DamlLfExpression } from "../../daml-lf/model/daml-lf-expression.js";
import { DamlLfValueDefinition } from "../../daml-lf/model/daml-lf-value-definition.js";
import { DamlLfTemplateId } from "../../daml-lf/model/daml-lf-template-id.js";
import { ReplaySourceMapException } from "../errors/replay-source-map.exception.js";
import { SourceIndexedCompilation } from "../source/source-indexed-compilation.js";
import { ReplayEntrypoint } from "./replay-entrypoint.js";

export interface ResolvedReplayEntrypointDefinition {
    packageId: string;
    moduleName: string;
    definition: DamlLfValueDefinition;
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
        const source = this.findExerciseSourceOrThrow(templateId, choiceName);

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
                "exercise",
                templateId,
                choiceName,
            ),
        };
    }

    private resolveReplayStrategy(
        expression: DamlLfExpression,
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
            const choiceReplayExpression =
                this.resolveChoiceReplayExpression(
                    templateId,
                    choiceName,
                );

            if (choiceReplayExpression !== undefined) {
                return {
                    replayExpression: choiceReplayExpression,
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

    private findExerciseSourceOrThrow(
        templateId: DamlLfTemplateId,
        choiceName: string | undefined,
    ) {
        const source = this.indexedCompilation.getExecutableSources().find((candidate) =>
            this.matchesTemplate(candidate, templateId)
            && candidate.entrypointKind === "exercise"
            && candidate.choiceName === choiceName);

        if (source === undefined) {
            throw new ReplaySourceMapException(
                `missing executable metadata for choice '${templateId.packageId}::${templateId.moduleName}::${templateId.templateName}::${choiceName ?? "<unknown>"}'`,
            );
        }

        return source;
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
}
