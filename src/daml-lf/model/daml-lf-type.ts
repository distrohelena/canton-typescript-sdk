import { DamlLfBuiltinType } from "./daml-lf-builtin-type.js";
import { DamlLfNodeKind } from "./daml-lf-node-kind.js";
import { TypeConReference } from "./type-con-reference.js";

export class DamlLfType {
    public readonly nodeKind = DamlLfNodeKind.type;
    public readonly builtinType: DamlLfBuiltinType;
    public readonly typeConReference?: TypeConReference;

    public constructor(init: {
        builtinType?: DamlLfBuiltinType;
        typeConReference?: TypeConReference;
    }) {
        this.builtinType = init.builtinType ?? DamlLfBuiltinType.unknown;
        this.typeConReference = init.typeConReference;
    }
}
