import { DamlTestingCatalog } from "../daml/daml-testing-catalog.js";

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

export interface ResolvedDeclarativeTarget {
    readonly actors: readonly string[];
    readonly choice: string;
    readonly key: string;
    readonly templateId: string;
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

export function resolveDeclarativeTargets(
    catalog: DamlTestingCatalog,
    descriptors: readonly (TemplateTarget | ExcludedChoiceTarget)[],
): readonly ResolvedDeclarativeTarget[] {
    const excluded = new Set(
        descriptors
            .filter((descriptor): descriptor is ExcludedChoiceTarget =>
                descriptor.kind === "exclude-choice",
            )
            .map((descriptor) => `${descriptor.templateId}:${descriptor.choice}`),
    );

    return descriptors
        .filter((descriptor): descriptor is TemplateTarget => descriptor.kind === "template")
        .flatMap((descriptor) => {
            const template = catalog.templates.find(
                (item) => item.templateId === descriptor.templateId,
            );

            if (template === undefined) {
                return [];
            }

            return descriptor.choices
                .filter((choice) => template.choices.includes(choice))
                .filter((choice) => !excluded.has(`${descriptor.templateId}:${choice}`))
                .map((choice) => Object.freeze({
                    key: `${descriptor.templateId}:${choice}`,
                    templateId: descriptor.templateId,
                    choice,
                    actors: descriptor.actors,
                }));
        })
        .sort((left, right) => left.key.localeCompare(right.key));
}
