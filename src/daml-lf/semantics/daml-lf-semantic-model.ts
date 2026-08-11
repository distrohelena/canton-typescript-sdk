import { DamlLfChoice } from "../model/daml-lf-choice.js";
import { DamlLfCompilation } from "../daml-lf-compilation.js";
import { DamlLfDataType } from "../model/daml-lf-data-type.js";
import { DamlLfField } from "../model/daml-lf-field.js";
import { DamlLfTemplate } from "../model/daml-lf-template.js";
import { DamlLfTemplateId } from "../model/daml-lf-template-id.js";
import { TypeConReference } from "../model/type-con-reference.js";

export type DamlLfDataTypeEntry = {
    readonly reference: TypeConReference;
    readonly definition: DamlLfDataType;
};

export class DamlLfSemanticModel {
    public constructor(private readonly compilation: DamlLfCompilation) {
        void this.compilation;
    }

    /** Returns the templates exposed by the compiled workspace. */
    public getTemplates(): readonly DamlLfTemplate[] {
        return this.compilation.getTemplates();
    }

    /** Returns every named data type with its fully qualified identity. */
    public getDataTypes(): readonly DamlLfDataTypeEntry[] {
        return this.compilation.getPackages().flatMap((pkg) =>
            pkg.modules.flatMap((module) =>
                module.definitions
                    .filter((definition): definition is DamlLfDataType =>
                        definition instanceof DamlLfDataType)
                    .map((definition) => Object.freeze({
                        reference: Object.freeze(new TypeConReference({
                            packageId: pkg.packageId,
                            moduleName: module.name,
                            name: definition.name,
                        })),
                        definition,
                    }))
            )
        );
    }

    /** Returns the choices declared on a template identity. */
    public getTemplateChoicesOrThrow(
        templateId: DamlLfTemplateId,
    ): readonly DamlLfChoice[] {
        return this.compilation.getTemplateChoicesOrThrow(templateId);
    }

    /** Returns the record fields for a resolved type constructor reference. */
    public getRecordFieldsOrThrow(
        reference: TypeConReference,
    ): readonly DamlLfField[] {
        return this.getDataTypeOrThrow(reference).fields;
    }

    /** Returns the complete resolved data type for a type constructor reference. */
    public getDataTypeOrThrow(reference: TypeConReference): DamlLfDataType {
        return this.compilation.getTypeSymbolOrThrow(reference).definition;
    }
}
