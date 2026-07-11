import { DamlLfCompilation } from "../../daml-lf/daml-lf-compilation.js";
import { DarSourceBundle } from "../../daml-lf/container/dar-source-bundle.js";
import { ReplaySourceMapException } from "../errors/replay-source-map.exception.js";
import {
    SourceMappingPrecision,
} from "./source-mapping-precision.js";

export interface IndexedDefinitionSource {
    packageId: string;
    moduleName: string;
    definitionName: string;
    path: string;
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
    precision: SourceMappingPrecision;
}

export interface IndexedExecutableSource extends IndexedDefinitionSource {
    entrypointKind?: "create" | "exercise";
    templateName?: string;
    choiceName?: string;
}

export class SourceIndexedCompilation {
    private readonly definitionSources = new Map<string, IndexedExecutableSource>();
    private readonly moduleSources = new Map<string, IndexedDefinitionSource>();

    private constructor(public readonly compilation: DamlLfCompilation) {}

    public static createOrThrow(
        compilation: DamlLfCompilation,
        sourceBundles: readonly DarSourceBundle[],
    ): SourceIndexedCompilation {
        const indexed = new SourceIndexedCompilation(compilation);

        for (const bundle of sourceBundles) {
            for (const executable of bundle.metadata.executables) {
                const source: IndexedExecutableSource = {
                    packageId: executable.packageId,
                    moduleName: executable.moduleName,
                    definitionName: executable.definitionName,
                    path: executable.path,
                    startLine: executable.startLine,
                    startColumn: executable.startColumn,
                    endLine: executable.endLine,
                    endColumn: executable.endColumn,
                    precision:
                        executable.precision
                        ?? SourceMappingPrecision.fallback,
                    entrypointKind: executable.entrypointKind,
                    templateName: executable.templateName,
                    choiceName: executable.choiceName,
                };

                indexed.definitionSources.set(
                    SourceIndexedCompilation.createDefinitionKey(
                        executable.packageId,
                        executable.moduleName,
                        executable.definitionName,
                    ),
                    source,
                );
                indexed.moduleSources.set(
                    SourceIndexedCompilation.createModuleKey(
                        executable.packageId,
                        executable.moduleName,
                    ),
                    source,
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
            SourceIndexedCompilation.createDefinitionKey(
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

    public getModuleSourceOrThrow(
        packageId: string,
        moduleName: string,
    ): IndexedDefinitionSource {
        const source = this.moduleSources.get(
            SourceIndexedCompilation.createModuleKey(packageId, moduleName),
        );

        if (source === undefined) {
            throw new ReplaySourceMapException(
                `missing source mapping for module '${packageId}::${moduleName}'`,
            );
        }

        return source;
    }

    public getExecutableSources(): readonly IndexedExecutableSource[] {
        return [...this.definitionSources.values()];
    }

    private static createDefinitionKey(
        packageId: string,
        moduleName: string,
        definitionName: string,
    ): string {
        return `${packageId}::${moduleName}::${definitionName}`;
    }

    private static createModuleKey(
        packageId: string,
        moduleName: string,
    ): string {
        return `${packageId}::${moduleName}`;
    }
}
