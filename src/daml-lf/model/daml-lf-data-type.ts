import { DamlLfDefinition } from "./daml-lf-definition.js";
import { DamlLfField } from "./daml-lf-field.js";
import { DamlLfNodeKind } from "./daml-lf-node-kind.js";
import { DamlLfType } from "./daml-lf-type.js";

export type DamlLfTypeParameterKind =
    | {
        readonly kind: "star";
    }
    | {
        readonly kind: "nat";
    }
    | {
        readonly kind: "arrow";
        readonly parameters: readonly DamlLfTypeParameterKind[];
        readonly result: DamlLfTypeParameterKind;
    }
    | {
        readonly kind: "unknown";
        readonly internedKindIndex?: number;
    };

export interface DamlLfTypeParameter {
    readonly name?: string;
    readonly internedStringIndex: number;
    readonly kind: DamlLfTypeParameterKind;
}

export type DamlLfDataTypeDefinition =
    | {
        readonly kind: "record";
        readonly fields: readonly DamlLfField[];
    }
    | {
        readonly kind: "variant";
        readonly constructors: readonly DamlLfVariantConstructor[];
    }
    | {
        readonly kind: "enum";
        readonly constructors: readonly string[];
    };

export interface DamlLfVariantConstructor {
    readonly name: string;
    readonly type: DamlLfType;
}

export class DamlLfDataType extends DamlLfDefinition {
    public readonly nodeKind = DamlLfNodeKind.dataType;
    public readonly definition: DamlLfDataTypeDefinition;
    public readonly fields: readonly DamlLfField[];
    public readonly typeParameters: readonly DamlLfTypeParameter[];

    public constructor(init: {
        name: string;
        definition?: DamlLfDataTypeDefinition;
        fields?: readonly DamlLfField[];
        typeParameters?: readonly DamlLfTypeParameter[];
    }) {
        super({
            name: init.name,
        });
        this.definition = init.definition ?? {
            kind: "record",
            fields: init.fields ?? [],
        };
        this.fields = this.definition.kind === "record"
            ? this.definition.fields
            : [];
        this.typeParameters = Object.freeze(
            (init.typeParameters ?? []).map((parameter) =>
                Object.freeze({
                    ...parameter,
                    kind: freezeTypeParameterKind(parameter.kind),
                }),
            ),
        );
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
