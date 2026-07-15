export interface DamlTestingChoice {
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
}

export function createDamlTestingCatalog(init: {
    readonly getTemplates: () => readonly {
        readonly choices: readonly { readonly name: string }[];
        readonly templateId: {
            readonly moduleName: string;
            readonly packageId: string;
            readonly templateName: string;
        };
    }[];
}): DamlTestingCatalog {
    const templates = init.getTemplates()
        .map((template) => Object.freeze({
            templateId: formatTemplateId(template.templateId),
            choices: Object.freeze(template.choices.map(({ name }) => name)),
        }))
        .sort((left, right) => left.templateId.localeCompare(right.templateId));

    return Object.freeze({
        templates: Object.freeze(templates),
        getChoice(templateId: string, choice: string): DamlTestingChoice | undefined {
            const template = templates.find((item) => item.templateId === templateId);

            return template?.choices.includes(choice) === true
                ? Object.freeze({ templateId, choice })
                : undefined;
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
