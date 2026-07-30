import { GeneratedNamedTypeFile } from "./generated-named-type-file.js";
import { GeneratedRegistryFile } from "./generated-registry-file.js";
import { GeneratedSpecFile } from "./generated-spec-file.js";
import { GeneratedSupportFile } from "./generated-support-file.js";
import { GeneratedTemplateBindingFile } from "./generated-template-binding-file.js";

type GeneratedProductionFile =
    | GeneratedTemplateBindingFile
    | GeneratedNamedTypeFile
    | GeneratedRegistryFile
    | GeneratedSupportFile;

export class GeneratedDamlInterfaceProject {
    public readonly templateFiles: readonly GeneratedTemplateBindingFile[];
    public readonly namedTypeFiles: readonly GeneratedNamedTypeFile[];
    public readonly supportFiles: readonly GeneratedSupportFile[];
    public readonly registryFile?: GeneratedRegistryFile;
    public readonly indexFile?: GeneratedSupportFile;
    /** Every non-spec module emitted by this project. */
    public readonly productionFiles: readonly GeneratedProductionFile[];
    /** Runnable specs, each colocated with exactly one production module. */
    public readonly specFiles: readonly GeneratedSpecFile[];

    public constructor(init: {
        templateFiles: readonly GeneratedTemplateBindingFile[];
        namedTypeFiles?: readonly GeneratedNamedTypeFile[];
        supportFiles?: readonly GeneratedSupportFile[];
        registryFile?: GeneratedRegistryFile;
        indexFile?: GeneratedSupportFile;
        specFiles?: readonly GeneratedSpecFile[];
    }) {
        this.templateFiles = init.templateFiles;
        this.namedTypeFiles = init.namedTypeFiles ?? [];
        this.supportFiles = init.supportFiles ?? [];
        this.registryFile = init.registryFile;
        this.indexFile = init.indexFile;
        this.productionFiles = [
            ...this.templateFiles,
            ...this.namedTypeFiles,
            ...this.supportFiles,
            ...(this.registryFile === undefined ? [] : [this.registryFile]),
            ...(this.indexFile === undefined ? [] : [this.indexFile]),
        ];
        this.specFiles = init.specFiles ?? [];

        this.validateFilesOrThrow();
    }

    private validateFilesOrThrow(): void {
        const productionPaths = new Set<string>();

        for (const file of this.productionFiles) {
            if (file.path.endsWith(".spec.ts")) {
                throw new Error(`Generated production file path must not end in .spec.ts: ${file.path}`);
            } else if (!file.path.endsWith(".ts")) {
                throw new Error(`Generated production file path must end in .ts: ${file.path}`);
            } else if (productionPaths.has(file.path)) {
                throw new Error(`Duplicate production file path: ${file.path}`);
            }

            productionPaths.add(file.path);
        }

        const specPaths = new Set<string>();

        for (const specFile of this.specFiles) {
            if (!productionPaths.has(specFile.productionPath)) {
                throw new Error(
                    `Generated spec references a production path that does not exist: ${specFile.productionPath}`,
                );
            }

            const expectedPath = specFile.productionPath.replace(/\.ts$/, ".spec.ts");

            if (specFile.path !== expectedPath) {
                throw new Error(
                    `Generated spec path must be the sibling .spec.ts file for ${specFile.productionPath}: ${specFile.path}`,
                );
            } else if (specPaths.has(specFile.path)) {
                throw new Error(`Duplicate generated spec file path: ${specFile.path}`);
            }

            specPaths.add(specFile.path);
        }
    }
}
