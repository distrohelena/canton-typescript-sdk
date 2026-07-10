import { DamlLfCompilation } from "../../daml-lf/daml-lf-compilation.js";
import { DarSourceBundle } from "../../daml-lf/container/dar-source-bundle.js";
import { ReplaySourceMapException } from "../errors/replay-source-map.exception.js";

export interface IndexedDefinitionSource {
    packageId: string;
    moduleName: string;
    definitionName: string;
    path: string;
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
}

export interface IndexedExecutableSource extends IndexedDefinitionSource {
    entrypointKind?: "create" | "exercise";
    templateName?: string;
    choiceName?: string;
}

export class SourceIndexedCompilation {
    private readonly definitionSources = new Map<string, IndexedExecutableSource>();

    private constructor(public readonly compilation: DamlLfCompilation) {}

    public static createOrThrow(
        compilation: DamlLfCompilation,
        sourceBundles: readonly DarSourceBundle[],
    ): SourceIndexedCompilation {
        const indexed = new SourceIndexedCompilation(compilation);

        for (const bundle of sourceBundles) {
            for (const executable of bundle.metadata.executables) {
                indexed.definitionSources.set(
                    SourceIndexedCompilation.createKey(
                        executable.packageId,
                        executable.moduleName,
                        executable.definitionName,
                    ),
                    {
                        packageId: executable.packageId,
                        moduleName: executable.moduleName,
                        definitionName: executable.definitionName,
                        path: executable.path,
                        startLine: executable.startLine,
                        startColumn: executable.startColumn,
                        endLine: executable.endLine,
                        endColumn: executable.endColumn,
                        entrypointKind: executable.entrypointKind,
                        templateName: executable.templateName,
                        choiceName: executable.choiceName,
                    },
                );
            }
        }

        return indexed;
    }

    public getDefinitionSourceOrThrow(
        packageId: string,
        moduleName: string,
        definitionName: string,
    ): IndexedDefinitionSource {
        const source = this.definitionSources.get(
            SourceIndexedCompilation.createKey(
                packageId,
                moduleName,
                definitionName,
            ),
        );

        if (source === undefined) {
            throw new ReplaySourceMapException(
                `missing source mapping for '${packageId}::${moduleName}::${definitionName}'`,
            );
        }

        return source;
    }

    public getExecutableSources(): readonly IndexedExecutableSource[] {
        return [...this.definitionSources.values()];
    }

    private static createKey(
        packageId: string,
        moduleName: string,
        definitionName: string,
    ): string {
        return `${packageId}::${moduleName}::${definitionName}`;
    }
}
