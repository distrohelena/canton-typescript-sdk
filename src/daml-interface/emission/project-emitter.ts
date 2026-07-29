import { DamlInterfaceAnalysisResult } from "../analysis/daml-interface-analyzer.js";
import { GeneratedDamlInterfaceProject } from "../emission-model/generated-daml-interface-project.js";
import { NamedTypeEmitter } from "./named-type-emitter.js";
import { RegistryEmitter } from "./registry-emitter.js";
import { SupportFileEmitter } from "./support-file-emitter.js";
import { TemplateBindingEmitter } from "./template-binding-emitter.js";

export class ProjectEmitter {
    public constructor(
        private readonly templateBindingEmitter: TemplateBindingEmitter = new TemplateBindingEmitter(),
        private readonly supportFileEmitter: SupportFileEmitter = new SupportFileEmitter(),
        private readonly registryEmitter: RegistryEmitter = new RegistryEmitter(),
        private readonly namedTypeEmitter: NamedTypeEmitter = new NamedTypeEmitter(),
    ) {
        void this.templateBindingEmitter;
        void this.namedTypeEmitter;
        void this.supportFileEmitter;
        void this.registryEmitter;
    }

    /** Emits the complete in-memory DAML interface project from analyzed templates. */
    public emitProject(
        analysis: DamlInterfaceAnalysisResult,
    ): GeneratedDamlInterfaceProject {
        this.templateBindingEmitter.prepareTemplatesOrThrow(analysis.templates);

        const templateFiles = analysis.templates.map((template) =>
            this.templateBindingEmitter.emitTemplateFile(template),
        );

        const namedTypeFiles = this.namedTypeEmitter.emitNamedTypeFiles(
            analysis.typeDefinitions,
        );

        const supportFiles = [
            ...this.supportFileEmitter.emitSupportFiles(analysis),
            ...this.supportFileEmitter.emitNamespaceFiles(
                new GeneratedDamlInterfaceProject({ templateFiles, namedTypeFiles }),
            ),
        ];

        const baseProject = new GeneratedDamlInterfaceProject({
            templateFiles,
            namedTypeFiles,
            supportFiles,
        });

        const registryFile = this.registryEmitter.emitRegistry(baseProject);

        const projectWithRegistry = new GeneratedDamlInterfaceProject({
            templateFiles,
            namedTypeFiles,
            supportFiles,
            registryFile,
        });

        const indexFile = this.supportFileEmitter.emitIndexFile(
            projectWithRegistry,
        );

        return new GeneratedDamlInterfaceProject({
            templateFiles,
            namedTypeFiles,
            supportFiles,
            registryFile,
            indexFile,
        });
    }
}
