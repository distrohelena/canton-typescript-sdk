import { DamlLfCompilation } from "../daml-lf-compilation.js";
import { DamlLfBuiltinDispatch } from "./daml-lf-builtin-dispatch.js";

export class DamlLfInterpreterScaffold {
    private readonly builtinDispatch = new DamlLfBuiltinDispatch();

    public constructor(private readonly compilation: DamlLfCompilation) {
        void this.compilation;
    }

    public getCompilation(): DamlLfCompilation {
        return this.compilation;
    }

    public getBuiltinDispatch(): DamlLfBuiltinDispatch {
        return this.builtinDispatch;
    }
}
