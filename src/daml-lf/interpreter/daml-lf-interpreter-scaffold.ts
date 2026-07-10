import { DamlLfCompilation } from "../daml-lf-compilation.js";
import { DamlLfBuiltinDispatch } from "./daml-lf-builtin-dispatch.js";
import { DamlLfEvaluator } from "./daml-lf-evaluator.js";

export class DamlLfInterpreterScaffold {
    private readonly builtinDispatch = new DamlLfBuiltinDispatch();
    private readonly evaluator: DamlLfEvaluator;

    public constructor(private readonly compilation: DamlLfCompilation) {
        this.evaluator = new DamlLfEvaluator(
            this.compilation,
            this.builtinDispatch,
        );
    }

    public getCompilation(): DamlLfCompilation {
        return this.compilation;
    }

    public getBuiltinDispatch(): DamlLfBuiltinDispatch {
        return this.builtinDispatch;
    }

    public getEvaluator(): DamlLfEvaluator {
        return this.evaluator;
    }
}
