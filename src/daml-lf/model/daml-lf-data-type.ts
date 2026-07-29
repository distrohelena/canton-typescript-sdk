import { DamlLfDefinition } from "./daml-lf-definition.js";
import { DamlLfField } from "./daml-lf-field.js";
import { DamlLfNodeKind } from "./daml-lf-node-kind.js";
import { DamlLfType } from "./daml-lf-type.js";

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

    public constructor(init: {
        name: string;
        definition?: DamlLfDataTypeDefinition;
        fields?: readonly DamlLfField[];
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
    }
}
