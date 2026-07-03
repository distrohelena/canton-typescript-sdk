import { DamlLfBuiltinType } from "./daml-lf-builtin-type.js";
import { DamlLfNodeKind } from "./daml-lf-node-kind.js";

export class DamlLfType {
    public readonly nodeKind = DamlLfNodeKind.type;
    public readonly builtinType: DamlLfBuiltinType;

    public constructor(init: { builtinType: DamlLfBuiltinType }) {
        this.builtinType = init.builtinType;
    }
}
