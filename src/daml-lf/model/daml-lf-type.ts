import { DamlLfBuiltinType } from "./daml-lf-builtin-type.js";
import {
    DamlLfTypeParameter,
    DamlLfTypeParameterKind,
} from "./daml-lf-data-type.js";
import { DamlLfNodeKind } from "./daml-lf-node-kind.js";
import { TypeConReference } from "./type-con-reference.js";

export interface DamlLfTypeVariableReference {
    readonly name?: string;
    readonly internedStringIndex: number;
}

export interface DamlLfDiagnosticForall {
    readonly typeParameters: readonly DamlLfTypeParameter[];
    readonly body: DamlLfType;
}

export class DamlLfType {
    public readonly nodeKind = DamlLfNodeKind.type;
    public readonly builtinType: DamlLfBuiltinType;
    public readonly numericScale?: number;
    public readonly typeConReference?: TypeConReference;
    public readonly typeVariable?: DamlLfTypeVariableReference;
    public readonly diagnosticForall?: DamlLfDiagnosticForall;
    public readonly typeArguments: readonly DamlLfType[];

    public constructor(init: {
        builtinType?: DamlLfBuiltinType;
        numericScale?: number;
        typeConReference?: TypeConReference;
        typeVariable?: DamlLfTypeVariableReference;
        diagnosticForall?: DamlLfDiagnosticForall;
        typeArguments?: readonly DamlLfType[];
    }) {
        this.builtinType = init.builtinType ?? DamlLfBuiltinType.unknown;

        if (init.numericScale !== undefined) {
            this.numericScale = init.numericScale;
        }

        this.typeConReference = init.typeConReference;
        this.typeVariable = init.typeVariable === undefined
            ? undefined
            : Object.freeze({ ...init.typeVariable });
        this.diagnosticForall = init.diagnosticForall === undefined
            ? undefined
            : Object.freeze({
                typeParameters: Object.freeze(
                    init.diagnosticForall.typeParameters.map((parameter) =>
                        Object.freeze({
                            ...parameter,
                            kind: freezeTypeParameterKind(parameter.kind),
                        }),
                    ),
                ),
                body: init.diagnosticForall.body,
            });
        this.typeArguments = Object.freeze([...(init.typeArguments ?? [])]);
    }
}

function freezeTypeParameterKind(
    kind: DamlLfTypeParameterKind,
): DamlLfTypeParameterKind {
    if (kind.kind !== "arrow") {
        return Object.freeze({ ...kind });
    }

    return Object.freeze({
        kind: "arrow",
        parameters: Object.freeze(
            kind.parameters.map((parameter) => freezeTypeParameterKind(parameter)),
        ),
        result: freezeTypeParameterKind(kind.result),
    });
}
