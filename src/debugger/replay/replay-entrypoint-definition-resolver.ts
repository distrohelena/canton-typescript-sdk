import { DamlLfValueDefinition } from "../../daml-lf/model/daml-lf-value-definition.js";
import { DamlLfTemplateId } from "../../daml-lf/model/daml-lf-template-id.js";
import { ReplaySourceMapException } from "../errors/replay-source-map.exception.js";
import { SourceIndexedCompilation } from "../source/source-indexed-compilation.js";
import { ReplayEntrypoint } from "./replay-entrypoint.js";

export interface ResolvedReplayEntrypointDefinition {
    packageId: string;
    moduleName: string;
    definition: DamlLfValueDefinition;
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

        return {
            packageId: source.packageId,
            moduleName: source.moduleName,
            definition: this.indexedCompilation.compilation.getValueDefinitionOrThrow(
                source.packageId,
                source.moduleName,
                source.definitionName,
            ),
        };
    }

    public resolveChoiceDefinitionOrThrow(
        templateId: DamlLfTemplateId,
        choiceName: string,
    ): ResolvedReplayEntrypointDefinition {
        const source = this.findExerciseSourceOrThrow(templateId, choiceName);

        return {
            packageId: source.packageId,
            moduleName: source.moduleName,
            definition: this.indexedCompilation.compilation.getValueDefinitionOrThrow(
                source.packageId,
                source.moduleName,
                source.definitionName,
            ),
        };
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
}
