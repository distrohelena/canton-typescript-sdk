import { DamlLfBuiltinType } from "../../daml-lf/model/daml-lf-builtin-type.js";
import { AnalyzedChoice } from "../analysis/analyzed-choice.js";
import { AnalyzedDamlType } from "../analysis/analyzed-daml-type.js";
import {
    AnalyzedTemplate,
    AnalyzedTemplateField,
} from "../analysis/analyzed-template.js";

interface ResolvedTemplateNames {
    readonly template: AnalyzedTemplate;
    readonly identityKey: string;
    readonly namespaceAlias: string;
    readonly filePath: string;
    readonly className: string;
    readonly fieldNames: ReadonlyMap<AnalyzedTemplateField, ResolvedFieldNames>;
    readonly choiceNames: ReadonlyMap<AnalyzedChoice, ResolvedChoiceNames>;
}

interface ResolvedFieldNames {
    readonly propertyName: string;
    readonly constructorParameterName: string;
}

interface ResolvedChoiceNames {
    readonly methodName: string;
    readonly choiceTypeName: string;
    readonly exercisedEventTypeName: string;
    readonly parameterName: string;
    readonly identityKey: string;
}

interface NamedValue<T> {
    readonly value: T;
    readonly key: string;
    readonly baseName: string;
    readonly scope?: string;
    readonly collisionSeparator?: string;
}

const typeScriptKeywords = new Set([
    "as", "async", "await", "break", "case", "catch", "class", "const", "continue",
    "debugger", "default", "delete", "do", "else", "enum", "export", "extends", "false",
    "finally", "for", "from", "function", "get", "if", "implements", "import", "in",
    "instanceof", "interface", "let", "new", "null", "of", "package", "private", "protected",
    "public", "return", "set", "static", "super", "switch", "this", "throw", "true", "try",
    "type", "typeof", "undefined", "var", "void", "while", "with", "yield",
]);

const damlTemplateMemberNames = new Set([
    "constructor", "get", "contractId", "templateId", "create", "decodeCreatedEvent",
    "decodeExercisedEvent",
]);

const reservedTypeNames = new Set(["DamlTemplate"]);

export class TypeScriptNameResolver {
    private readonly templatesByIdentity = new Map<string, AnalyzedTemplate>();
    private resolvedTemplates = new Map<string, ResolvedTemplateNames>();

    public constructor(templates: readonly AnalyzedTemplate[] = []) {
        this.prepareTemplatesOrThrow(templates);
    }

    /** Prepares a project-wide name table and rejects irreconcilable output collisions. */
    public prepareTemplatesOrThrow(templates: readonly AnalyzedTemplate[]): void {
        for (const template of templates) {
            const identityKey = this.getTemplateIdentityKey(template);

            const existing = this.templatesByIdentity.get(identityKey);

            if (existing !== undefined && existing !== template) {
                throw new Error(
                    `Cannot generate duplicate DAML template identity '${this.describeTemplate(template)}' `
                    + `and '${this.describeTemplate(existing)}'`,
                );
            }

            this.templatesByIdentity.set(identityKey, template);
        }

        const allTemplates = [...this.templatesByIdentity.values()];

        const packageIds = [...new Set(allTemplates.map((template) =>
            template.templateId.packageId,
        ))];

        const modulesByIdentity = new Map(
            allTemplates.map((template) => [
                this.getPackageModuleIdentityKey(template),
                template,
            ]),
        );

        const packageDirectories = this.resolveNames(
            packageIds.map((packageId) => ({
                value: packageId,
                key: `package\u0000${packageId}`,
                baseName: this.toKebabCase(packageId),
                scope: "packages",
            })),
        );

        const moduleDirectories = this.resolveNames(
            [...modulesByIdentity.entries()].map(([identityKey, template]) => ({
                value: identityKey,
                key: `module\u0000${identityKey}`,
                baseName: this.getModuleDirectory(template),
                scope: template.templateId.packageId,
            })),
        );

        const fileNames = this.resolveNames(
            allTemplates.map((template) => ({
                value: template,
                key: this.getTemplateIdentityKey(template),
                baseName: this.toKebabCase(template.templateId.templateName),
                scope: `${template.templateId.packageId}\u0000${template.templateId.moduleName}`,
            })),
        );

        const namespaceAliases = this.resolveNames(
            [...modulesByIdentity.entries()].map(([identityKey, template]) => ({
                value: identityKey,
                key: `namespace\u0000${identityKey}`,
                baseName: this.safeTypeName(
                    `${template.templateId.packageId} ${template.templateId.moduleName}`,
                ),
                collisionSeparator: "_",
            })),
        );

        const classNames = this.resolveNames(
            allTemplates.map((template) => ({
                value: template,
                key: this.getTemplateIdentityKey(template),
                baseName: this.safeTypeName(template.templateId.templateName),
                collisionSeparator: "_",
            })),
        );

        this.resolvedTemplates = new Map(allTemplates.map((template) => {
            const identityKey = this.getTemplateIdentityKey(template);

            const className = classNames.get(template);

            if (className === undefined) {
                throw new Error(`Could not resolve generated class name for '${this.describeTemplate(template)}'`);
            }

            const packageDirectory = packageDirectories.get(template.templateId.packageId);

            const moduleDirectory = moduleDirectories.get(
                this.getPackageModuleIdentityKey(template),
            );

            const fileName = fileNames.get(template);

            const namespaceAlias = namespaceAliases.get(
                this.getPackageModuleIdentityKey(template),
            );

            if (
                packageDirectory === undefined ||
                moduleDirectory === undefined ||
                fileName === undefined ||
                namespaceAlias === undefined
            ) {
                throw new Error(`Could not resolve generated path for '${this.describeTemplate(template)}'`);
            }

            return [
                identityKey,
                {
                    template,
                    identityKey,
                    namespaceAlias,
                    filePath: `generated/packages/${packageDirectory}/${moduleDirectory}/${fileName}.ts`,
                    className,
                    fieldNames: this.resolveFieldNames(template),
                    choiceNames: this.resolveChoiceNames(template, className, identityKey),
                },
            ];
        }));

        this.assertDistinctTemplateOutput("file path", (resolved) => resolved.filePath);
        this.assertDistinctNamespaceAliases(namespaceAliases);
        this.assertDistinctTemplateOutput("class name", (resolved) => resolved.className);
    }

    /** Resolves the full package/module/entity identity key for a template. */
    public getTemplateIdentityKey(template: AnalyzedTemplate): string {
        return [
            template.templateId.packageId,
            template.templateId.moduleName,
            template.templateId.templateName,
        ].join("\u0000");
    }

    /** Resolves the generated namespace alias for a template package/module. */
    public getNamespaceAlias(template: AnalyzedTemplate): string {
        return this.getResolvedTemplate(template).namespaceAlias;
    }

    /** Resolves the generated file path for a template binding. */
    public getTemplateFilePath(template: AnalyzedTemplate): string {
        return this.getResolvedTemplate(template).filePath;
    }

    /** Resolves the generated class name for a template binding. */
    public getTemplateClassName(template: AnalyzedTemplate): string {
        return this.getResolvedTemplate(template).className;
    }

    /** Resolves the generated create-fields type name for a template. */
    public getCreateFieldsTypeName(template: AnalyzedTemplate): string {
        return `${this.getTemplateClassName(template)}CreateFields`;
    }

    /** Resolves the generated created-event type name for a template. */
    public getCreatedEventTypeName(template: AnalyzedTemplate): string {
        return `${this.getTemplateClassName(template)}CreatedEvent`;
    }

    /** Resolves the generated property name for an original DAML template field. */
    public getFieldPropertyName(
        template: AnalyzedTemplate,
        field: AnalyzedTemplateField,
    ): string {
        return this.getResolvedField(template, field).propertyName;
    }

    /** Resolves the generated constructor parameter for an original DAML template field. */
    public getFieldConstructorParameterName(
        template: AnalyzedTemplate,
        field: AnalyzedTemplateField,
    ): string {
        return this.getResolvedField(template, field).constructorParameterName;
    }

    /** Resolves the generated exercise method name for a DAML choice. */
    public getChoiceMethodName(
        template: AnalyzedTemplate,
        choice: AnalyzedChoice,
    ): string {
        return this.getResolvedChoice(template, choice).methodName;
    }

    /** Resolves the generated choice payload type name for a template choice. */
    public getChoiceTypeName(
        template: AnalyzedTemplate,
        choice: AnalyzedChoice,
    ): string {
        return this.getResolvedChoice(template, choice).choiceTypeName;
    }

    /** Resolves the generated exercised-event type name for a template choice. */
    public getExercisedEventTypeName(
        template: AnalyzedTemplate,
        choice: AnalyzedChoice,
    ): string {
        return this.getResolvedChoice(template, choice).exercisedEventTypeName;
    }

    /** Resolves the generated parameter property name for a DAML choice. */
    public getChoiceParameterName(
        template: AnalyzedTemplate,
        choice: AnalyzedChoice,
    ): string {
        return this.getResolvedChoice(template, choice).parameterName;
    }

    /** Resolves the full identity key for a DAML choice. */
    public getChoiceIdentityKey(
        template: AnalyzedTemplate,
        choice: AnalyzedChoice,
    ): string {
        return this.getResolvedChoice(template, choice).identityKey;
    }

    /** Resolves the TypeScript type name for a supported DAML-LF type. */
    public getTypeName(type: AnalyzedDamlType): string {
        return type.kind === "primitive" && type.builtinType === DamlLfBuiltinType.text
            ? "string"
            : "unknown";
    }

    /** Resolves the literal template identifier used by generated helpers. */
    public getTemplateIdLiteral(template: AnalyzedTemplate): string {
        return `${template.templateId.packageId}:${template.templateId.moduleName}:${template.templateId.templateName}`;
    }

    private getResolvedTemplate(template: AnalyzedTemplate): ResolvedTemplateNames {
        const identityKey = this.getTemplateIdentityKey(template);

        if (!this.resolvedTemplates.has(identityKey)) {
            this.prepareTemplatesOrThrow([template]);
        }

        const resolved = this.resolvedTemplates.get(identityKey);

        if (resolved === undefined) {
            throw new Error(`Could not resolve DAML template '${this.describeTemplate(template)}'`);
        }

        return resolved;
    }

    private getResolvedField(
        template: AnalyzedTemplate,
        field: AnalyzedTemplateField,
    ): ResolvedFieldNames {
        const resolved = this.getResolvedTemplate(template).fieldNames.get(field);

        if (resolved === undefined) {
            throw new Error(`Could not resolve field '${field.name}' for '${this.describeTemplate(template)}'`);
        }

        return resolved;
    }

    private getResolvedChoice(
        template: AnalyzedTemplate,
        choice: AnalyzedChoice,
    ): ResolvedChoiceNames {
        const resolved = this.getResolvedTemplate(template).choiceNames.get(choice);

        if (resolved === undefined) {
            throw new Error(`Could not resolve choice '${choice.name}' for '${this.describeTemplate(template)}'`);
        }

        return resolved;
    }

    private resolveFieldNames(template: AnalyzedTemplate): ReadonlyMap<AnalyzedTemplateField, ResolvedFieldNames> {
        const propertyNames = this.resolveNames(template.createFields.map((field, index) => ({
            value: field,
            key: `${this.getTemplateIdentityKey(template)}\u0000field\u0000${field.name}\u0000${index}`,
            baseName: this.safeMemberName(field.name),
            collisionSeparator: "_",
        })));

        return new Map(template.createFields.map((field) => {
            const propertyName = propertyNames.get(field);

            if (propertyName === undefined) {
                throw new Error(`Could not resolve field '${field.name}' for '${this.describeTemplate(template)}'`);
            }

            return [field, { propertyName, constructorParameterName: propertyName }];
        }));
    }

    private resolveChoiceNames(
        template: AnalyzedTemplate,
        className: string,
        templateIdentityKey: string,
    ): ReadonlyMap<AnalyzedChoice, ResolvedChoiceNames> {
        const stems = this.resolveNames(template.choices.map((choice, index) => ({
            value: choice,
            key: `${templateIdentityKey}\u0000choice\u0000${choice.name}\u0000${index}`,
            baseName: this.safeTypeName(choice.name),
            collisionSeparator: "_",
        })));

        return new Map(template.choices.map((choice) => {
            const stem = stems.get(choice);

            if (stem === undefined) {
                throw new Error(`Could not resolve choice '${choice.name}' for '${this.describeTemplate(template)}'`);
            }

            const choiceIdentityKey = `${templateIdentityKey}\u0000${choice.name}`;

            return [
                choice,
                {
                    methodName: this.safeMemberName(`exercise${stem}`),
                    choiceTypeName: `${className}${stem}Choice`,
                    exercisedEventTypeName: `${className}${stem}ExercisedEvent`,
                    parameterName: this.safeMemberName(choice.parameterName),
                    identityKey: choiceIdentityKey,
                },
            ];
        }));
    }

    private resolveNames<T>(values: readonly NamedValue<T>[]): ReadonlyMap<T, string> {
        const groups = new Map<string, NamedValue<T>[]>();

        for (const value of values) {
            const groupKey = `${value.scope ?? ""}\u0000${value.baseName}`;

            const group = groups.get(groupKey) ?? [];

            group.push(value);
            groups.set(groupKey, group);
        }

        const names = new Map<T, string>();

        for (const group of groups.values()) {
            for (const value of group) {
                names.set(
                    value.value,
                    group.length === 1
                        ? value.baseName
                        : `${value.baseName}${value.collisionSeparator ?? "-"}${this.shortHash(value.key)}`,
                );
            }
        }

        return names;
    }

    private assertDistinctTemplateOutput(
        outputName: string,
        getOutput: (resolved: ResolvedTemplateNames) => string,
    ): void {
        const outputs = new Map<string, ResolvedTemplateNames>();

        for (const resolved of this.resolvedTemplates.values()) {
            const output = getOutput(resolved);

            const existing = outputs.get(output);

            if (existing !== undefined && existing.identityKey !== resolved.identityKey) {
                throw new Error(
                    `Cannot resolve generated ${outputName} '${output}' for `
                    + `'${this.describeTemplate(existing.template)}' and '${this.describeTemplate(resolved.template)}'`,
                );
            }

            outputs.set(output, resolved);
        }
    }

    private assertDistinctNamespaceAliases(
        namespaceAliases: ReadonlyMap<string, string>,
    ): void {
        const identitiesByAlias = new Map<string, string>();

        for (const [identityKey, alias] of namespaceAliases) {
            const existingIdentityKey = identitiesByAlias.get(alias);

            if (existingIdentityKey !== undefined && existingIdentityKey !== identityKey) {
                throw new Error(
                    `Cannot resolve generated namespace alias '${alias}' for `
                    + `'${existingIdentityKey.replaceAll("\u0000", ":")}' and `
                    + `'${identityKey.replaceAll("\u0000", ":")}'`,
                );
            }

            identitiesByAlias.set(alias, identityKey);
        }
    }

    private getModuleDirectory(template: AnalyzedTemplate): string {
        return template.templateId.moduleName
            .split(".")
            .map((segment) => this.toKebabCase(segment))
            .join("/");
    }

    private getPackageModuleIdentityKey(template: AnalyzedTemplate): string {
        return [template.templateId.packageId, template.templateId.moduleName].join("\u0000");
    }

    private safeTypeName(value: string): string {
        const identifier = this.toPascalCase(value);

        const safeIdentifier = /^[0-9]/.test(identifier) ? `_${identifier}` : identifier;

        return reservedTypeNames.has(safeIdentifier)
            ? `${safeIdentifier}Binding`
            : safeIdentifier;
    }

    private safeMemberName(value: string): string {
        const pascalCase = this.toPascalCase(value);

        const identifier = `${pascalCase[0].toLowerCase()}${pascalCase.slice(1)}`;

        const safeIdentifier = /^[0-9]/.test(identifier) ? `_${identifier}` : identifier;

        return typeScriptKeywords.has(safeIdentifier) || damlTemplateMemberNames.has(safeIdentifier)
            ? `${safeIdentifier}Value`
            : safeIdentifier;
    }

    private toPascalCase(value: string): string {
        const normalizedValue = value
            .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
            .replace(/[^A-Za-z0-9]+/g, " ")
            .trim();

        if (normalizedValue.length === 0) {
            throw new Error("Cannot normalize an empty DAML identifier");
        }

        return normalizedValue
            .split(/\s+/)
            .map((segment) => segment[0].toUpperCase() + segment.slice(1))
            .join("");
    }

    private toKebabCase(value: string): string {
        return this.toPascalCase(value)
            .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
            .toLowerCase();
    }

    private shortHash(value: string): string {
        let hash = 0x811c9dc5;

        for (const character of value) {
            hash ^= character.charCodeAt(0);
            hash = Math.imul(hash, 0x01000193);
        }

        return (hash >>> 0).toString(36).padStart(6, "0").slice(-6);
    }

    private describeTemplate(template: AnalyzedTemplate): string {
        return `${template.templateId.packageId}:${template.templateId.moduleName}:${template.templateId.templateName}`;
    }
}
