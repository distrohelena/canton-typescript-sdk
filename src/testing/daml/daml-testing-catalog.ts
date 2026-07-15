import { DamlLfType } from "../../daml-lf/model/daml-lf-type.js";

export interface DamlTestingChoice {
    readonly argumentType?: DamlLfType;
    readonly choice: string;
    readonly templateId: string;
}

export interface DamlTestingTemplate {
    readonly choices: readonly string[];
    readonly templateId: string;
}

export interface DamlTestingCatalog {
    readonly templates: readonly DamlTestingTemplate[];
    getChoice(templateId: string, choice: string): DamlTestingChoice | undefined;
    getTemplate(templateId: string): DamlTestingTemplate | undefined;
}

export function createDamlTestingCatalog(init: {
    readonly getTemplates: () => readonly {
        readonly choices: readonly {
            readonly name: string;
            readonly parameter?: { readonly type: DamlLfType };
        }[];
        readonly templateId: {
            readonly moduleName: string;
            readonly packageId: string;
            readonly templateName: string;
        };
    }[];
}): DamlTestingCatalog {
    const choices = new Map<string, DamlTestingChoice>();

    const templates = init.getTemplates()
        .map((template) => {
            const templateId = formatTemplateId(template.templateId);

            for (const choice of template.choices) {
                choices.set(
                    createChoiceKey(templateId, choice.name),
                    Object.freeze({
                        templateId,
                        choice: choice.name,
                        ...(choice.parameter === undefined
                            ? {}
                            : { argumentType: choice.parameter.type }),
                    }),
                );
            }

            return Object.freeze({
                templateId,
                choices: Object.freeze(template.choices.map(({ name }) => name)),
            });
        })
        .sort((left, right) => left.templateId.localeCompare(right.templateId));

    return Object.freeze({
        templates: Object.freeze(templates),
        getChoice(templateId: string, choice: string): DamlTestingChoice | undefined {
            return choices.get(createChoiceKey(templateId, choice));
        },
        getTemplate(templateId: string): DamlTestingTemplate | undefined {
            return templates.find((template) => template.templateId === templateId);
        },
    });
}

function formatTemplateId(value: {
    readonly moduleName: string;
    readonly packageId: string;
    readonly templateName: string;
}): string {
    return `${value.packageId}:${value.moduleName}:${value.templateName}`;
}

function createChoiceKey(templateId: string, choice: string): string {
    return `${templateId}:${choice}`;
}
