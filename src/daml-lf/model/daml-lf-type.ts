import { DamlLfBuiltinType } from "./daml-lf-builtin-type.js";
import { DamlLfNodeKind } from "./daml-lf-node-kind.js";
import { TypeConReference } from "./type-con-reference.js";

export class DamlLfType {
    public readonly nodeKind = DamlLfNodeKind.type;
    public readonly builtinType: DamlLfBuiltinType;
    public readonly numericScale?: number;
    public readonly typeConReference?: TypeConReference;
    public readonly typeArguments: readonly DamlLfType[];

    public constructor(init: {
        builtinType?: DamlLfBuiltinType;
        numericScale?: number;
        typeConReference?: TypeConReference;
        typeArguments?: readonly DamlLfType[];
    }) {
        this.builtinType = init.builtinType ?? DamlLfBuiltinType.unknown;

        if (init.numericScale !== undefined) {
            this.numericScale = init.numericScale;
        }

        this.typeConReference = init.typeConReference;
        this.typeArguments = Object.freeze([...(init.typeArguments ?? [])]);
    }
}
