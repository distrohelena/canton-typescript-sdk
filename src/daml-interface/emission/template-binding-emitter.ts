import { AnalyzedTemplate } from "../analysis/analyzed-template.js";
import { GeneratedChoiceBinding } from "../emission-model/generated-choice-binding.js";
import { GeneratedTemplateBinding } from "../emission-model/generated-template-binding.js";
import {
    GeneratedTemplateBindingField,
} from "../emission-model/generated-template-binding.js";
import { GeneratedTemplateBindingFile } from "../emission-model/generated-template-binding-file.js";
import { TypeScriptNameResolver } from "./type-script-name-resolver.js";

export class TemplateBindingEmitter {
    public constructor(
        private readonly nameResolver: TypeScriptNameResolver = new TypeScriptNameResolver(),
    ) {
        void this.nameResolver;
    }

    /** Emits a generated TypeScript file for one analyzed DAML template. */
    public emitTemplateFile(
        template: AnalyzedTemplate,
    ): GeneratedTemplateBindingFile {
        const binding = this.createBinding(template);

        const contents = this.emitContents(binding);

        return new GeneratedTemplateBindingFile({
            path: binding.path,
            contents,
            binding,
        });
    }

    private createBinding(template: AnalyzedTemplate): GeneratedTemplateBinding {
        return new GeneratedTemplateBinding({
            className: template.className,
            templateIdLiteral: this.nameResolver.getTemplateIdLiteral(template),
            path: this.nameResolver.getTemplateFilePath(template),
            createFieldsTypeName:
                this.nameResolver.getCreateFieldsTypeName(template),
            createdEventTypeName:
                this.nameResolver.getCreatedEventTypeName(template),
            createFields: template.createFields.map(
                (field) =>
                    new GeneratedTemplateBindingField({
                        name: field.name,
                        propertyName: field.propertyName,
                        typeName: this.nameResolver.getTypeName(field.type),
                    }),
            ),
            choices: template.choices.map(
                (choice) =>
                    new GeneratedChoiceBinding({
                        name: choice.name,
                        methodName: choice.methodName,
                        choiceTypeName: this.nameResolver.getChoiceTypeName(
                            template,
                            choice,
                        ),
                        exercisedEventTypeName:
                            this.nameResolver.getExercisedEventTypeName(
                                template,
                                choice,
                            ),
                        parameterName: choice.parameterName,
                        parameterTypeName:
                            this.nameResolver.getTypeName(choice.parameterType),
                        returnTypeName:
                            this.nameResolver.getTypeName(choice.returnType),
                    }),
            ),
        });
    }

    private emitContents(binding: GeneratedTemplateBinding): string {
        const createFields = binding.createFields
            .map(
                (field) =>
                    `    ${field.propertyName}: ${field.typeName};`,
            )
            .join("\n");

        const choiceInterfaces = binding.choices
            .map(
                (choice) =>
                    [
                        `export interface ${choice.choiceTypeName} {`,
                        `    ${choice.parameterName}: ${choice.parameterTypeName};`,
                        "}",
                    ].join("\n"),
            )
            .join("\n\n");

        const exercisedEvents = binding.choices
            .map(
                (choice) =>
                    [
                        `export interface ${choice.exercisedEventTypeName} {`,
                        `    choiceName: "${choice.name}";`,
                        `    result: ${choice.returnTypeName};`,
                        "}",
                    ].join("\n"),
            )
            .join("\n\n");

        const choiceMethods = binding.choices
            .map(
                (choice) =>
                    [
                        `    public static ${choice.methodName}(`,
                        "        contractId: string,",
                        `        choice: ${choice.choiceTypeName},`,
                        "    ): unknown {",
                        "        return {",
                        "            contractId,",
                        `            choiceName: "${choice.name}",`,
                        "            choice,",
                        "        };",
                        "    }",
                    ].join("\n"),
            )
            .join("\n\n");

        const exercisedReturnType =
            binding.choices.length === 1
                ? binding.choices[0].exercisedEventTypeName
                : binding.choices
                    .map((choice) => choice.exercisedEventTypeName)
                    .join(" | ");

        return [
            `export interface ${binding.createFieldsTypeName} {`,
            createFields,
            "}",
            "",
            choiceInterfaces,
            "",
            `export interface ${binding.createdEventTypeName} {`,
            "    templateId: string;",
            `    payload: ${binding.createFieldsTypeName};`,
            "}",
            "",
            exercisedEvents,
            "",
            `export class ${binding.className} {`,
            `    public static readonly templateId = "${binding.templateIdLiteral}";`,
            "",
            `    public static create(fields: ${binding.createFieldsTypeName}): unknown {`,
            "        return {",
            `            templateId: ${binding.className}.templateId,`,
            "            fields,",
            "        };",
            "    }",
            "",
            choiceMethods,
            "",
            `    public static decodeCreatedEvent(event: unknown): ${binding.createdEventTypeName} {`,
            `        return event as ${binding.createdEventTypeName};`,
            "    }",
            "",
            `    public static decodeExercisedEvent(event: unknown): ${exercisedReturnType} {`,
            `        return event as ${exercisedReturnType};`,
            "    }",
            "}",
        ].filter((item) => item.length > 0).join("\n");
    }
}
