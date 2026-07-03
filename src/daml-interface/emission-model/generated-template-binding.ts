import { GeneratedChoiceBinding } from "./generated-choice-binding.js";

export class GeneratedTemplateBindingField {
    public readonly name: string;
    public readonly propertyName: string;
    public readonly typeName: string;

    public constructor(init: {
        name: string;
        propertyName: string;
        typeName: string;
    }) {
        this.name = init.name;
        this.propertyName = init.propertyName;
        this.typeName = init.typeName;
    }
}

export class GeneratedTemplateBinding {
    public readonly className: string;
    public readonly templateIdLiteral: string;
    public readonly path: string;
    public readonly createFieldsTypeName: string;
    public readonly createdEventTypeName: string;
    public readonly createFields: readonly GeneratedTemplateBindingField[];
    public readonly choices: readonly GeneratedChoiceBinding[];

    public constructor(init: {
        className: string;
        templateIdLiteral: string;
        path: string;
        createFieldsTypeName: string;
        createdEventTypeName: string;
        createFields: readonly GeneratedTemplateBindingField[];
        choices: readonly GeneratedChoiceBinding[];
    }) {
        this.className = init.className;
        this.templateIdLiteral = init.templateIdLiteral;
        this.path = init.path;
        this.createFieldsTypeName = init.createFieldsTypeName;
        this.createdEventTypeName = init.createdEventTypeName;
        this.createFields = init.createFields;
        this.choices = init.choices;
    }
}
