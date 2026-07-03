import { DamlLfBuiltinType } from "../../daml-lf/model/daml-lf-builtin-type.js";
import { DamlLfType } from "../../daml-lf/model/daml-lf-type.js";
import { AnalyzedChoice } from "../analysis/analyzed-choice.js";
import { AnalyzedTemplate } from "../analysis/analyzed-template.js";

export class TypeScriptNameResolver {
    /** Resolves the generated file path for a template binding. */
    public getTemplateFilePath(template: AnalyzedTemplate): string {
        return `generated/${this.getModuleDirectory(template)}/${template.fileName}`;
    }

    /** Resolves the generated create-fields type name for a template. */
    public getCreateFieldsTypeName(template: AnalyzedTemplate): string {
        return `${template.className}CreateFields`;
    }

    /** Resolves the generated created-event type name for a template. */
    public getCreatedEventTypeName(template: AnalyzedTemplate): string {
        return `${template.className}CreatedEvent`;
    }

    /** Resolves the generated choice payload type name for a template choice. */
    public getChoiceTypeName(
        template: AnalyzedTemplate,
        choice: AnalyzedChoice,
    ): string {
        return `${template.className}${choice.name}Choice`;
    }

    /** Resolves the generated exercised-event type name for a template choice. */
    public getExercisedEventTypeName(
        template: AnalyzedTemplate,
        choice: AnalyzedChoice,
    ): string {
        return `${template.className}${choice.name}ExercisedEvent`;
    }

    /** Resolves the TypeScript type name for a supported DAML-LF type. */
    public getTypeName(type: DamlLfType): string {
        return type.builtinType === DamlLfBuiltinType.text ? "string" : "unknown";
    }

    /** Resolves the literal template identifier used by generated helpers. */
    public getTemplateIdLiteral(template: AnalyzedTemplate): string {
        return `${template.templateId.moduleName}:${template.templateId.templateName}`;
    }

    private getModuleDirectory(template: AnalyzedTemplate): string {
        return template.templateId.moduleName
            .split(".")
            .map((segment) => this.toKebabCase(segment))
            .join("/");
    }

    private toKebabCase(value: string): string {
        return value
            .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
            .replace(/[^A-Za-z0-9]+/g, "-")
            .toLowerCase();
    }
}
