import { DamlLfChoice } from "../model/daml-lf-choice.js";
import { DamlLfCompilation } from "../daml-lf-compilation.js";
import { DamlLfField } from "../model/daml-lf-field.js";
import { DamlLfTemplate } from "../model/daml-lf-template.js";
import { DamlLfTemplateId } from "../model/daml-lf-template-id.js";
import { TypeConReference } from "../model/type-con-reference.js";

export class DamlLfSemanticModel {
    public constructor(private readonly compilation: DamlLfCompilation) {
        void this.compilation;
    }

    /** Returns the templates exposed by the compiled workspace. */
    public getTemplates(): readonly DamlLfTemplate[] {
        return this.compilation.getTemplates();
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
        return this.compilation.getTypeSymbolOrThrow(reference).definition.fields;
    }
}
