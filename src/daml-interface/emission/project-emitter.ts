import { DamlInterfaceAnalysisResult } from "../analysis/daml-interface-analyzer.js";
import { GeneratedDamlInterfaceProject } from "../emission-model/generated-daml-interface-project.js";
import { GeneratedSpecEmitter } from "./generated-spec-emitter.js";
import { NamedTypeEmitter } from "./named-type-emitter.js";
import { RegistryEmitter } from "./registry-emitter.js";
import { SupportFileEmitter } from "./support-file-emitter.js";
import { TemplateBindingEmitter } from "./template-binding-emitter.js";
import { TypeScriptNameResolver } from "./type-script-name-resolver.js";

export class ProjectEmitter {
    public constructor(
        private readonly nameResolver: TypeScriptNameResolver = new TypeScriptNameResolver(),
        private readonly templateBindingEmitter: TemplateBindingEmitter = new TemplateBindingEmitter(nameResolver),
        private readonly supportFileEmitter: SupportFileEmitter = new SupportFileEmitter(),
        private readonly registryEmitter: RegistryEmitter = new RegistryEmitter(),
        private readonly namedTypeEmitter: NamedTypeEmitter = new NamedTypeEmitter(nameResolver),
    ) {
        void this.nameResolver;
        void this.templateBindingEmitter;
        void this.namedTypeEmitter;
        void this.supportFileEmitter;
        void this.registryEmitter;
    }

    /** Emits the complete in-memory DAML interface project from analyzed templates. */
    public emitProject(
        analysis: DamlInterfaceAnalysisResult,
    ): GeneratedDamlInterfaceProject {
        this.namedTypeEmitter.prepareProjectOrThrow(
            analysis.templates,
            analysis.typeDefinitions,
            analysis.packageMetadata,
        );

        const templateBindingFiles = analysis.templates.map((template) =>
            this.templateBindingEmitter.emitTemplateBindingFile(template),
        );

        const namedTypeFiles = this.namedTypeEmitter.emitPreparedNamedTypeFiles(
            analysis.typeDefinitions,
            templateBindingFiles,
        );

        const templateFiles = analysis.templates.map((template) =>
            this.templateBindingEmitter.emitTemplateFile(template, namedTypeFiles),
        );

        const supportFiles = [
            ...this.supportFileEmitter.emitSupportFiles(analysis, namedTypeFiles),
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

        const project = new GeneratedDamlInterfaceProject({
            templateFiles,
            namedTypeFiles,
            supportFiles,
            registryFile,
            indexFile,
        });

        return new GeneratedDamlInterfaceProject({
            templateFiles,
            namedTypeFiles,
            supportFiles,
            registryFile,
            indexFile,
            specFiles: GeneratedSpecEmitter.emitSpecFiles(project, analysis),
        });
    }
}
