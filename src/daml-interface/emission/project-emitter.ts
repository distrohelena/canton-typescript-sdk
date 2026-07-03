import { DamlInterfaceAnalysisResult } from "../analysis/daml-interface-analyzer.js";
import { GeneratedDamlInterfaceProject } from "../emission-model/generated-daml-interface-project.js";
import { RegistryEmitter } from "./registry-emitter.js";
import { SupportFileEmitter } from "./support-file-emitter.js";
import { TemplateBindingEmitter } from "./template-binding-emitter.js";

export class ProjectEmitter {
    public constructor(
        private readonly templateBindingEmitter: TemplateBindingEmitter = new TemplateBindingEmitter(),
        private readonly supportFileEmitter: SupportFileEmitter = new SupportFileEmitter(),
        private readonly registryEmitter: RegistryEmitter = new RegistryEmitter(),
    ) {
        void this.templateBindingEmitter;
        void this.supportFileEmitter;
        void this.registryEmitter;
    }

    /** Emits the complete in-memory DAML interface project from analyzed templates. */
    public emitProject(
        analysis: DamlInterfaceAnalysisResult,
    ): GeneratedDamlInterfaceProject {
        const templateFiles = analysis.templates.map((template) =>
            this.templateBindingEmitter.emitTemplateFile(template),
        );

        const supportFiles = this.supportFileEmitter.emitSupportFiles();

        const baseProject = new GeneratedDamlInterfaceProject({
            templateFiles,
            supportFiles,
        });

        const registryFile = this.registryEmitter.emitRegistry(baseProject);

        const projectWithRegistry = new GeneratedDamlInterfaceProject({
            templateFiles,
            supportFiles,
            registryFile,
        });

        const indexFile = this.supportFileEmitter.emitIndexFile(
            projectWithRegistry,
        );

        return new GeneratedDamlInterfaceProject({
            templateFiles,
            supportFiles,
            registryFile,
            indexFile,
        });
    }
}
