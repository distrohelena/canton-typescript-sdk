import { DamlLfDefinition } from "./daml-lf-definition.js";
import { DamlLfField } from "./daml-lf-field.js";
import { DamlLfNodeKind } from "./daml-lf-node-kind.js";

export class DamlLfDataType extends DamlLfDefinition {
    public readonly nodeKind = DamlLfNodeKind.dataType;
    public readonly fields: readonly DamlLfField[];

    public constructor(init: {
        name: string;
        fields: readonly DamlLfField[];
    }) {
        super({
            name: init.name,
        });
        this.fields = init.fields;
    }
}
