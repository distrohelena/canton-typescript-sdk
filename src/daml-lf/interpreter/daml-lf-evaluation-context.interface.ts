import { DamlLfCompilation } from "../daml-lf-compilation.js";

export interface IDamlLfEvaluationContext {
    readonly compilation: DamlLfCompilation;
}
