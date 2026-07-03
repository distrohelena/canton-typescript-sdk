import { DamlLfCompilation } from "../daml-lf-compilation.js";
import { DamlLfField } from "../model/daml-lf-field.js";
import { TypeConReference } from "../model/type-con-reference.js";

export class DamlLfSemanticModel {
    public constructor(private readonly compilation: DamlLfCompilation) {
        void this.compilation;
    }

    public getRecordFieldsOrThrow(
        reference: TypeConReference,
    ): readonly DamlLfField[] {
        return this.compilation.getTypeSymbolOrThrow(reference).definition.fields;
    }
}
