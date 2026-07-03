import { DamlLfChoice } from "./daml-lf-choice.js";
import { DamlLfDefinition } from "./daml-lf-definition.js";
import { DamlLfField } from "./daml-lf-field.js";
import { DamlLfNodeKind } from "./daml-lf-node-kind.js";
import { DamlLfTemplateId } from "./daml-lf-template-id.js";

export class DamlLfTemplate extends DamlLfDefinition {
    public readonly nodeKind = DamlLfNodeKind.template;
    public readonly templateId: DamlLfTemplateId;
    public readonly fields: readonly DamlLfField[];
    public readonly choices: readonly DamlLfChoice[];

    public constructor(init: {
        templateId: DamlLfTemplateId;
        name: string;
        fields: readonly DamlLfField[];
        choices: readonly DamlLfChoice[];
    }) {
        super({
            name: init.name,
        });
        this.templateId = init.templateId;
        this.fields = init.fields;
        this.choices = init.choices;
    }
}
