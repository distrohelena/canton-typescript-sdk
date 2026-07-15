export interface TemplateTarget {
    readonly actors: readonly string[];
    readonly choices: readonly string[];
    readonly kind: "template";
    readonly templateId: string;
}

export interface ExcludedChoiceTarget {
    readonly choice: string;
    readonly kind: "exclude-choice";
    readonly templateId: string;
}

export interface TemplateTargetBuilder {
    actors(actors: readonly string[]): TemplateTargetBuilder;
    choice(choice: string): TemplateTarget;
}

export function targetTemplate(templateId: string): TemplateTargetBuilder {
    let actors: readonly string[] = [];

    return Object.freeze({
        actors(value: readonly string[]): TemplateTargetBuilder {
            actors = Object.freeze([...value]);

            return this;
        },
        choice(choice: string): TemplateTarget {
            return Object.freeze({
                kind: "template",
                templateId,
                actors,
                choices: Object.freeze([choice]),
            });
        },
    });
}

export function excludeChoice(
    templateId: string,
    choice: string,
): ExcludedChoiceTarget {
    return Object.freeze({
        kind: "exclude-choice",
        templateId,
        choice,
    });
}
