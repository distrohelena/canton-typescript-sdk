import { DarSourceFileEntry } from "./dar-source-file-entry.js";

export interface DarSourceBundleMetadataExecutable {
    packageId: string;
    moduleName: string;
    definitionName: string;
    path: string;
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
    precision?: "exact" | "fallback";
    entrypointKind?: "create" | "exercise";
    templateName?: string;
    choiceName?: string;
}

export class DarSourceBundle {
    public readonly sourceFiles: readonly DarSourceFileEntry[];
    public readonly metadata: {
        packageId?: string;
        importedPackages?: readonly string[];
        executables: readonly DarSourceBundleMetadataExecutable[];
    };

    public constructor(init: {
        sourceFiles: readonly DarSourceFileEntry[];
        metadata: {
            packageId?: string;
            importedPackages?: readonly string[];
            executables: readonly DarSourceBundleMetadataExecutable[];
        };
    }) {
        this.sourceFiles = init.sourceFiles;
        this.metadata = init.metadata;
    }
}
