import { DamlTestingCatalog } from "../daml/daml-testing-catalog.js";
import { TestingConfigurationError } from "../errors/testing-configuration-error.js";

export interface TemplateTarget {
    readonly allChoices?: true;
    readonly actors: readonly string[];
    readonly choices: readonly string[];
    readonly kind: "template";
    readonly templateId: string;
}

export interface TemplateCreateTarget {
    readonly actors: readonly string[];
    readonly kind: "template-create";
    readonly templateId: string;
}

export interface ExcludedChoiceTarget {
    readonly choice: string;
    readonly kind: "exclude-choice";
    readonly templateId: string;
}

export interface ExcludedTemplateTarget {
    readonly kind: "exclude-template";
    readonly templateId: string;
}

export interface TemplateTargetBuilder {
    allChoices(): TemplateTarget;
    actors(actors: readonly string[]): TemplateTargetBuilder;
    choice(choice: string): TemplateTarget;
    create(): TemplateCreateTarget;
}

export interface ResolvedDeclarativeChoiceTarget {
    readonly actors: readonly string[];
    readonly choice: string;
    readonly key: string;
    readonly templateId: string;
}

export interface ResolvedDeclarativeCreateTarget {
    readonly actors: readonly string[];
    readonly key: string;
    readonly kind: "create";
    readonly templateId: string;
}

export type ResolvedDeclarativeTarget =
    | ResolvedDeclarativeChoiceTarget
    | ResolvedDeclarativeCreateTarget;

export function targetTemplate(templateId: string): TemplateTargetBuilder {
    let actors: readonly string[] = [];

    return Object.freeze({
        allChoices(): TemplateTarget {
            return Object.freeze({
                kind: "template",
                templateId,
                actors,
                choices: Object.freeze([]),
                allChoices: true,
            });
        },
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
        create(): TemplateCreateTarget {
            return Object.freeze({
                kind: "template-create",
                templateId,
                actors,
            });
        },
    });
}

/** Builds one immutable declarative template-choice target without a builder chain. */
export function targetChoice(
    templateId: string,
    choice: string,
    actors: readonly string[],
): TemplateTarget {
    return Object.freeze({
        kind: "template",
        templateId,
        actors: Object.freeze([...actors]),
        choices: Object.freeze([choice]),
    });
}

/** Builds one immutable declarative contract-create target without a builder chain. */
export function targetCreate(
    templateId: string,
    actors: readonly string[],
): TemplateCreateTarget {
    return Object.freeze({
        kind: "template-create",
        templateId,
        actors: Object.freeze([...actors]),
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

export function excludeTemplate(templateId: string): ExcludedTemplateTarget {
    return Object.freeze({
        kind: "exclude-template",
        templateId,
    });
}

export function resolveDeclarativeTargets(
    catalog: DamlTestingCatalog,
    descriptors: readonly (
        | TemplateTarget
        | TemplateCreateTarget
        | ExcludedChoiceTarget
        | ExcludedTemplateTarget
    )[],
): readonly ResolvedDeclarativeTarget[] {
    for (const descriptor of descriptors) {
        if (descriptor.kind === "template") {
            continue;
        }

        const template = catalog.getTemplate(descriptor.templateId);

        if (template === undefined) {
            throw new TestingConfigurationError(
                `Declarative target '${descriptor.templateId}' is absent from the DAML catalog.`,
            );
        } else if (
            descriptor.kind === "exclude-choice"
            && !template.choices.includes(descriptor.choice)
        ) {
            throw new TestingConfigurationError(
                `Declarative target '${descriptor.templateId}:${descriptor.choice}' is absent from the DAML catalog.`,
            );
        }
    }

    const excludedTemplates = new Set(
        descriptors
            .filter((descriptor): descriptor is ExcludedTemplateTarget =>
                descriptor.kind === "exclude-template",
            )
            .map((descriptor) => descriptor.templateId),
    );

    const excluded = new Set(
        descriptors
            .filter((descriptor): descriptor is ExcludedChoiceTarget =>
                descriptor.kind === "exclude-choice",
            )
            .map((descriptor) => `${descriptor.templateId}:${descriptor.choice}`),
    );

    return descriptors
        .filter((descriptor): descriptor is TemplateTarget | TemplateCreateTarget =>
            descriptor.kind === "template" || descriptor.kind === "template-create")
        .flatMap<ResolvedDeclarativeTarget>((descriptor): readonly ResolvedDeclarativeTarget[] => {
            const template = catalog.getTemplate(descriptor.templateId);

            if (template === undefined) {
                throw new TestingConfigurationError(
                    `Declarative target '${descriptor.templateId}' is absent from the DAML catalog.`,
                );
            } else if (descriptor.kind === "template-create") {
                return [Object.freeze({
                    key: `${descriptor.templateId}:create`,
                    templateId: descriptor.templateId,
                    actors: descriptor.actors,
                    kind: "create" as const,
                } satisfies ResolvedDeclarativeCreateTarget)];
            } else {
                if (descriptor.allChoices === true && excludedTemplates.has(descriptor.templateId)) {
                    return [];
                }

                const choices = (descriptor.allChoices === true
                    ? template.choices.filter((choice) =>
                        !excluded.has(`${descriptor.templateId}:${choice}`))
                    : descriptor.choices);

                const missingChoice = choices.find((choice) => !template.choices.includes(choice));

                if (missingChoice !== undefined) {
                    throw new TestingConfigurationError(
                        `Declarative target '${descriptor.templateId}:${missingChoice}' is absent from the DAML catalog.`,
                    );
                }

                return choices
                    .map((choice) => Object.freeze({
                        key: `${descriptor.templateId}:${choice}`,
                        templateId: descriptor.templateId,
                        choice,
                        actors: descriptor.actors,
                    } satisfies ResolvedDeclarativeChoiceTarget));
            }
        })
        .sort((left, right) => left.key.localeCompare(right.key));
}
