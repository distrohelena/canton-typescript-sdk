import { DamlLfValueDefinition } from "../../daml-lf/model/daml-lf-value-definition.js";
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

        const source = this.indexedCompilation
            .getExecutableSources()
            .find((candidate) => {
                if (
                    candidate.packageId !== templateId.packageId
                    || candidate.moduleName !== templateId.moduleName
                    || candidate.templateName !== templateId.entityName
                ) {
                    return false;
                }

                if (entrypoint.kind === "create") {
                    return candidate.entrypointKind === "create";
                }

                return (
                    candidate.entrypointKind === "exercise"
                    && candidate.choiceName === entrypoint.choice
                );
            });

        if (source === undefined) {
            throw new ReplaySourceMapException(
                `missing executable metadata for replay entrypoint '${templateId.packageId}::${templateId.moduleName}::${templateId.entityName}'`,
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
}
