import { GeneratedNamedTypeFile } from "./generated-named-type-file.js";
import { GeneratedRegistryFile } from "./generated-registry-file.js";
import { GeneratedSupportFile } from "./generated-support-file.js";
import { GeneratedTemplateBindingFile } from "./generated-template-binding-file.js";

export class GeneratedDamlInterfaceProject {
    public readonly templateFiles: readonly GeneratedTemplateBindingFile[];
    public readonly namedTypeFiles: readonly GeneratedNamedTypeFile[];
    public readonly supportFiles: readonly GeneratedSupportFile[];
    public readonly registryFile?: GeneratedRegistryFile;
    public readonly indexFile?: GeneratedSupportFile;

    public constructor(init: {
        templateFiles: readonly GeneratedTemplateBindingFile[];
        namedTypeFiles?: readonly GeneratedNamedTypeFile[];
        supportFiles?: readonly GeneratedSupportFile[];
        registryFile?: GeneratedRegistryFile;
        indexFile?: GeneratedSupportFile;
    }) {
        this.templateFiles = init.templateFiles;
        this.namedTypeFiles = init.namedTypeFiles ?? [];
        this.supportFiles = init.supportFiles ?? [];
        this.registryFile = init.registryFile;
        this.indexFile = init.indexFile;
    }
}
