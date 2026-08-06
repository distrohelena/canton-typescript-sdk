import { GeneratedChoiceBinding } from "./generated-choice-binding.js";
import { AnalyzedDamlType } from "../analysis/analyzed-daml-type.js";

export class GeneratedTemplateBindingField {
    public readonly name: string;
    public readonly propertyName: string;
    public readonly constructorParameterName: string;
    public readonly type: AnalyzedDamlType;
    public readonly typeName: string;

    public constructor(init: {
        name: string;
        propertyName: string;
        constructorParameterName?: string;
        type: AnalyzedDamlType;
        typeName: string;
    }) {
        this.name = init.name;
        this.propertyName = init.propertyName;
        this.constructorParameterName = init.constructorParameterName ?? init.propertyName;
        this.type = init.type;
        this.typeName = init.typeName;
    }
}

export class GeneratedTemplateBinding {
    public readonly templateIdentityKey: string;
    public readonly namespaceAlias: string;
    public readonly className: string;
    public readonly templateIdLiteral: string;
    /** The owning package's name; enables upgrade-aware (name-based) identity checks in emitted code. */
    public readonly packageName?: string;
    public readonly path: string;
    public readonly createFieldsTypeName: string;
    public readonly createdEventTypeName: string;
    public readonly createFields: readonly GeneratedTemplateBindingField[];
    public readonly choices: readonly GeneratedChoiceBinding[];

    public constructor(init: {
        templateIdentityKey?: string;
        namespaceAlias?: string;
        className: string;
        templateIdLiteral: string;
        packageName?: string;
        path: string;
        createFieldsTypeName: string;
        createdEventTypeName: string;
        createFields: readonly GeneratedTemplateBindingField[];
        choices: readonly GeneratedChoiceBinding[];
    }) {
        this.templateIdentityKey = init.templateIdentityKey ?? init.templateIdLiteral;
        this.namespaceAlias = init.namespaceAlias ?? init.className;
        this.className = init.className;
        this.templateIdLiteral = init.templateIdLiteral;
        this.packageName = init.packageName;
        this.path = init.path;
        this.createFieldsTypeName = init.createFieldsTypeName;
        this.createdEventTypeName = init.createdEventTypeName;
        this.createFields = init.createFields;
        this.choices = init.choices;
    }
}
