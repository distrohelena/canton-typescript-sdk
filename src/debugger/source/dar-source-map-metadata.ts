export interface DarSourceMapMetadataExecutable {
    packageId: string;
    moduleName: string;
    definitionName: string;
    path: string;
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
    entrypointKind?: "create" | "exercise";
    templateName?: string;
    choiceName?: string;
}

export class DarSourceMapMetadata {
    public readonly packageId?: string;
    public readonly importedPackages: readonly string[];
    public readonly executables: readonly DarSourceMapMetadataExecutable[];

    public constructor(init?: {
        packageId?: string;
        importedPackages?: readonly string[];
        executables?: readonly DarSourceMapMetadataExecutable[];
    }) {
        this.packageId = init?.packageId;
        this.importedPackages = init?.importedPackages ?? [];
        this.executables = init?.executables ?? [];
    }
}
