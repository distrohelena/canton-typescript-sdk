import { DamlLfTemplateId } from "../../daml-lf/model/daml-lf-template-id.js";
import { DamlLfType } from "../../daml-lf/model/daml-lf-type.js";
import { AnalyzedChoice } from "./analyzed-choice.js";

export class AnalyzedTemplateField {
    public readonly name: string;
    public readonly propertyName: string;
    public readonly type: DamlLfType;

    public constructor(init: {
        name: string;
        propertyName: string;
        type: DamlLfType;
    }) {
        this.name = init.name;
        this.propertyName = init.propertyName;
        this.type = init.type;
    }
}

export class AnalyzedTemplate {
    public readonly templateId: DamlLfTemplateId;
    public readonly className: string;
    public readonly fileName: string;
    public readonly createFields: readonly AnalyzedTemplateField[];
    public readonly choices: readonly AnalyzedChoice[];

    public constructor(init: {
        templateId: DamlLfTemplateId;
        className: string;
        fileName: string;
        createFields: readonly AnalyzedTemplateField[];
        choices: readonly AnalyzedChoice[];
    }) {
        this.templateId = init.templateId;
        this.className = init.className;
        this.fileName = init.fileName;
        this.createFields = init.createFields;
        this.choices = init.choices;
    }
}
