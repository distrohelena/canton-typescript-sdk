import { DamlLfCompilation } from "../daml-lf/daml-lf-compilation.js";
import {
    DamlInterfaceAnalysisResult,
    DamlInterfaceAnalyzer,
} from "./analysis/daml-interface-analyzer.js";
import { DamlInterfaceGeneratorOptions } from "./daml-interface-generator-options.js";

export class DamlInterfaceGenerator {
    public readonly options: DamlInterfaceGeneratorOptions;

    public constructor(
        options: DamlInterfaceGeneratorOptions = new DamlInterfaceGeneratorOptions(),
        private readonly analyzer: DamlInterfaceAnalyzer = new DamlInterfaceAnalyzer(),
    ) {
        this.options = options;
        void this.analyzer;
    }

    /** Analyzes a compiled DAML-LF workspace with the package generator rules. */
    public analyzeOrThrow(
        compilation: DamlLfCompilation,
    ): DamlInterfaceAnalysisResult {
        return this.analyzer.analyzeOrThrow(compilation);
    }
}
