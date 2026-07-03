import { DamlLfCompilation } from "../../daml-lf/daml-lf-compilation.js";
import { DamlLfBuiltinType } from "../../daml-lf/model/daml-lf-builtin-type.js";
import { DamlLfChoice } from "../../daml-lf/model/daml-lf-choice.js";
import { DamlLfField } from "../../daml-lf/model/daml-lf-field.js";
import { DamlLfTemplate } from "../../daml-lf/model/daml-lf-template.js";
import { DamlLfType } from "../../daml-lf/model/daml-lf-type.js";
import { DamlInterfaceUnsupportedShapeException } from "../errors/daml-interface-unsupported-shape.exception.js";
import { AnalyzedChoice } from "./analyzed-choice.js";
import { AnalyzedTemplate, AnalyzedTemplateField } from "./analyzed-template.js";

export class DamlInterfaceAnalysisResult {
    public readonly templates: readonly AnalyzedTemplate[];

    public constructor(init: { templates: readonly AnalyzedTemplate[] }) {
        this.templates = init.templates;
    }
}

export class DamlInterfaceAnalyzer {
    /** Analyzes compiled DAML-LF templates into generator-facing metadata. */
    public analyzeOrThrow(
        compilation: DamlLfCompilation,
    ): DamlInterfaceAnalysisResult {
        const semanticModel = compilation.createSemanticModel();

        const templates = semanticModel
            .getTemplates()
            .map((item) => this.analyzeTemplateOrThrow(item));

        return new DamlInterfaceAnalysisResult({
            templates,
        });
    }

    private analyzeTemplateOrThrow(template: DamlLfTemplate): AnalyzedTemplate {
        return new AnalyzedTemplate({
            templateId: template.templateId,
            className: this.toPascalCase(template.name),
            fileName: `${this.toKebabCase(template.name)}.ts`,
            createFields: template.fields.map((item) =>
                this.analyzeTemplateFieldOrThrow(item),
            ),
            choices: template.choices.map((item) =>
                this.analyzeChoiceOrThrow(item),
            ),
        });
    }

    private analyzeTemplateFieldOrThrow(
        field: DamlLfField,
    ): AnalyzedTemplateField {
        this.assertSupportedTypeOrThrow(
            field.type,
            `template field '${field.name}'`,
        );

        return new AnalyzedTemplateField({
            name: field.name,
            propertyName: this.toCamelCase(field.name),
            type: field.type,
        });
    }

    private analyzeChoiceOrThrow(choice: DamlLfChoice): AnalyzedChoice {
        this.assertSupportedTypeOrThrow(
            choice.parameter.type,
            `choice parameter '${choice.parameter.name}'`,
        );
        this.assertSupportedTypeOrThrow(
            choice.returnType,
            `choice return type '${choice.name}'`,
        );

        return new AnalyzedChoice({
            name: choice.name,
            methodName: `exercise${this.toPascalCase(choice.name)}`,
            parameterName: this.toCamelCase(choice.parameter.name),
            parameterType: choice.parameter.type,
            returnType: choice.returnType,
        });
    }

    private assertSupportedTypeOrThrow(type: DamlLfType, context: string): void {
        if (
            type.typeConReference !== undefined ||
            type.builtinType !== DamlLfBuiltinType.text
        ) {
            throw new DamlInterfaceUnsupportedShapeException(
                `${context} is not supported yet by the DAML interface generator`,
            );
        }
    }

    private toCamelCase(value: string): string {
        const pascalCase = this.toPascalCase(value);

        if (pascalCase.length === 0) {
            throw new DamlInterfaceUnsupportedShapeException(
                "DAML interface generator cannot normalize an empty identifier",
            );
        }

        return pascalCase[0].toLowerCase() + pascalCase.slice(1);
    }

    private toPascalCase(value: string): string {
        const normalizedValue = value
            .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
            .replace(/[^A-Za-z0-9]+/g, " ")
            .trim();

        if (normalizedValue.length === 0) {
            throw new DamlInterfaceUnsupportedShapeException(
                "DAML interface generator cannot normalize an empty identifier",
            );
        }

        return normalizedValue
            .split(/\s+/)
            .map(
                (segment) =>
                    segment[0].toUpperCase() + segment.slice(1),
            )
            .join("");
    }

    private toKebabCase(value: string): string {
        return this.toPascalCase(value)
            .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
            .toLowerCase();
    }
}
