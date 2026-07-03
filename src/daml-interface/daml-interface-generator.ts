import { DarArchiveLoader } from "../daml-lf/container/dar-archive-loader.js";
import { DamlLfCompilation } from "../daml-lf/daml-lf-compilation.js";
import { DamlLfPackageLoader } from "../daml-lf/daml-lf-package-loader.js";
import { DamlLfWorkspace } from "../daml-lf/daml-lf-workspace.js";
import {
    DamlInterfaceAnalysisResult,
    DamlInterfaceAnalyzer,
} from "./analysis/daml-interface-analyzer.js";
import { DamlInterfaceGeneratorOptions } from "./daml-interface-generator-options.js";
import { GeneratedDamlInterfaceProject } from "./emission-model/generated-daml-interface-project.js";
import { ProjectEmitter } from "./emission/project-emitter.js";

export class DamlInterfaceGenerator {
    public readonly options: DamlInterfaceGeneratorOptions;

    public constructor(
        options: DamlInterfaceGeneratorOptions = new DamlInterfaceGeneratorOptions(),
        private readonly analyzer: DamlInterfaceAnalyzer = new DamlInterfaceAnalyzer(),
        private readonly projectEmitter: ProjectEmitter = new ProjectEmitter(),
        private readonly darArchiveLoader: DarArchiveLoader = new DarArchiveLoader(),
        private readonly packageLoader: DamlLfPackageLoader = new DamlLfPackageLoader(),
    ) {
        this.options = options;

        void this.analyzer;
        void this.projectEmitter;
        void this.darArchiveLoader;
        void this.packageLoader;
    }

    /** Analyzes a compiled DAML-LF workspace with the package generator rules. */
    public analyzeOrThrow(
        compilation: DamlLfCompilation,
    ): DamlInterfaceAnalysisResult {
        return this.analyzer.analyzeOrThrow(compilation);
    }

    /** Generates an in-memory project from compiled DAML-LF archive bytes. */
    public async generateFromDalfOrThrowAsync(
        archiveBytes: Uint8Array,
    ): Promise<GeneratedDamlInterfaceProject> {
        const pkg = this.packageLoader.loadPackageOrThrow(archiveBytes);

        const compilation = DamlLfCompilation.createOrThrow(
            new DamlLfWorkspace([pkg]),
        );

        return this.projectEmitter.emitProject(
            this.analyzeOrThrow(compilation),
        );
    }

    /** Generates an in-memory project from DAR bytes. */
    public async generateFromDarOrThrowAsync(
        archiveBytes: Uint8Array,
    ): Promise<GeneratedDamlInterfaceProject> {
        const archive = await this.darArchiveLoader.loadDarOrThrowAsync(
            archiveBytes,
        );

        const packages = archive.packageEntries.map((entry) =>
            this.packageLoader.loadPackageOrThrow(entry.bytes),
        );

        const compilation = DamlLfCompilation.createOrThrow(
            new DamlLfWorkspace(packages),
        );

        return this.projectEmitter.emitProject(
            this.analyzeOrThrow(compilation),
        );
    }
}
