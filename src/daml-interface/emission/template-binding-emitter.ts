import { DamlLfBuiltinType } from "../../daml-lf/model/daml-lf-builtin-type.js";
import { DamlLfType } from "../../daml-lf/model/daml-lf-type.js";
import { AnalyzedDamlType } from "../analysis/analyzed-daml-type.js";
import { AnalyzedTemplate } from "../analysis/analyzed-template.js";
import { GeneratedChoiceBinding } from "../emission-model/generated-choice-binding.js";
import { GeneratedNamedTypeFile } from "../emission-model/generated-named-type-file.js";
import {
    GeneratedTemplateBinding,
    GeneratedTemplateBindingField,
} from "../emission-model/generated-template-binding.js";
import { GeneratedTemplateBindingFile } from "../emission-model/generated-template-binding-file.js";
import { TypeScriptNameResolver } from "./type-script-name-resolver.js";

type NamedReference = Extract<AnalyzedDamlType, { readonly kind: "namedReference" }>;

type ResolvedNamedReference = {
    readonly path: string;
    readonly exportedName: string;
    readonly alias: string;
};

/** Emits typed contract and exercise-event bindings for analyzed DAML templates. */
export class TemplateBindingEmitter {
    public constructor(
        private readonly nameResolver: TypeScriptNameResolver = new TypeScriptNameResolver(),
    ) {
        void this.nameResolver;
    }

    /** Prepares stable collision-safe names before emitting a complete project. */
    public prepareTemplatesOrThrow(templates: readonly AnalyzedTemplate[]): void {
        this.nameResolver.prepareTemplatesOrThrow(templates);
    }

    /** Emits a generated TypeScript file for one analyzed DAML template. */
    public emitTemplateFile(
        template: AnalyzedTemplate,
        namedTypeFiles: readonly GeneratedNamedTypeFile[] = [],
    ): GeneratedTemplateBindingFile {
        const namedReferences = this.resolveNamedReferences(template, namedTypeFiles);

        const binding = this.createBinding(template, namedReferences);

        return new GeneratedTemplateBindingFile({
            path: binding.path,
            contents: this.emitContents(binding, namedReferences),
            binding,
        });
    }

    /** Emits binding metadata without source, for resolving named declaration exports first. */
    public emitTemplateBindingFile(template: AnalyzedTemplate): GeneratedTemplateBindingFile {
        const namedReferences = this.resolveNamedReferences(template, []);

        const binding = this.createBinding(template, namedReferences);

        return new GeneratedTemplateBindingFile({
            path: binding.path,
            contents: "",
            binding,
        });
    }

    private createBinding(
        template: AnalyzedTemplate,
        namedReferences: ReadonlyMap<string, ResolvedNamedReference>,
    ): GeneratedTemplateBinding {
        return new GeneratedTemplateBinding({
            templateIdentityKey: this.nameResolver.getTemplateIdentityKey(template),
            namespaceAlias: this.nameResolver.getNamespaceAlias(template),
            className: this.nameResolver.getTemplateClassName(template),
            templateIdLiteral: this.nameResolver.getTemplateIdLiteral(template),
            path: this.nameResolver.getTemplateFilePath(template),
            createFieldsTypeName: this.nameResolver.getCreateFieldsTypeName(template),
            createdEventTypeName: this.nameResolver.getCreatedEventTypeName(template),
            createFields: template.createFields.map((field) =>
                new GeneratedTemplateBindingField({
                    name: field.name,
                    propertyName: this.nameResolver.getFieldPropertyName(template, field),
                    constructorParameterName: this.nameResolver.getFieldConstructorParameterName(template, field),
                    type: this.normalizeType(field.type),
                    typeName: this.getTypeName(this.normalizeType(field.type), namedReferences),
                })),
            choices: template.choices.map((choice) =>
                new GeneratedChoiceBinding({
                    choiceIdentityKey: this.nameResolver.getChoiceIdentityKey(template, choice),
                    name: choice.name,
                    methodName: this.nameResolver.getChoiceMethodName(template, choice),
                    choiceTypeName: this.nameResolver.getChoiceTypeName(template, choice),
                    exercisedEventTypeName: this.nameResolver.getExercisedEventTypeName(template, choice),
                    parameterName: this.nameResolver.getChoiceParameterName(template, choice),
                    parameterType: this.normalizeType(choice.parameterType),
                    parameterTypeName: this.getTypeName(this.normalizeType(choice.parameterType), namedReferences),
                    returnType: this.normalizeType(choice.returnType),
                    returnTypeName: this.getTypeName(this.normalizeType(choice.returnType), namedReferences),
                })),
        });
    }

    private emitContents(
        binding: GeneratedTemplateBinding,
        namedReferences: ReadonlyMap<string, ResolvedNamedReference>,
    ): string {
        const imports = this.emitImports(binding, namedReferences);

        const fields = binding.createFields.map((field) =>
            `    readonly ${field.propertyName}: ${field.typeName};`);

        const constructorParameters = binding.createFields.map((field) =>
            `${field.constructorParameterName}: ${field.typeName}`);

        const constructorAssignments = binding.createFields.map((field) =>
            `        this.${field.propertyName} = ${field.constructorParameterName};`);

        const orderedArguments = binding.createFields.map((field) =>
            `            fields.${field.propertyName},`);

        const exercisedReturnType = binding.choices.length === 0
            ? "never"
            : binding.choices.map((choice) => choice.exercisedEventTypeName).join(" | ");

        return [
            ...imports,
            "",
            `export interface ${binding.createFieldsTypeName} {`,
            ...fields,
            "}",
            "",
            this.emitTemplateClass(binding, constructorParameters, constructorAssignments, orderedArguments, exercisedReturnType),
            ...(binding.choices.length === 0 ? [] : ["", ...binding.choices.flatMap((choice) => [
                this.emitChoiceEventClass(binding, choice),
                "",
            ])]),
        ].join("\n");
    }

    private emitImports(
        binding: GeneratedTemplateBinding,
        namedReferences: ReadonlyMap<string, ResolvedNamedReference>,
    ): readonly string[] {
        const namedImports = new Map<string, Map<string, string>>();

        for (const reference of namedReferences.values()) {
            const imported = namedImports.get(reference.path) ?? new Map<string, string>();

            imported.set(reference.exportedName, reference.alias);
            namedImports.set(reference.path, imported);
        }

        return [
            'import { DamlMaterializationError, DamlTemplate, decodeDamlValue, materializeDamlValue, normalizeDamlCreatedEventSource, normalizeDamlExercisedEventSource } from "@distrohelena/canton-typescript-sdk/daml-interface";',
            'import type { DamlCreatedEventSource, DamlDate, DamlExercisedEventMetadata, DamlExercisedEventSource, DamlNormalizedExercisedEvent, DamlNumeric, DamlParty, DamlTimestamp, DamlTypeDescriptor, DamlUnit } from "@distrohelena/canton-typescript-sdk/daml-interface";',
            `import { generatedDamlTypeDescriptorRegistry } from ${JSON.stringify(this.relativeFilePath(binding.path, "generated/support/descriptors.ts"))};`,
            ...[...namedImports.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([path, imported]) =>
                `import type { ${[...imported.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([name, alias]) => `${name} as ${alias}`).join(", ")} } from ${JSON.stringify(path)};`),
        ];
    }

    private emitTemplateClass(
        binding: GeneratedTemplateBinding,
        constructorParameters: readonly string[],
        constructorAssignments: readonly string[],
        orderedArguments: readonly string[],
        exercisedReturnType: string,
    ): string {
        return [
            `export class ${binding.className} extends DamlTemplate implements ${binding.createFieldsTypeName} {`,
            `    public static readonly templateId = ${JSON.stringify(binding.templateIdLiteral)};`,
            `    private static readonly descriptor: DamlTypeDescriptor = ${this.emitTemplateDescriptor(binding)};`,
            "",
            ...binding.createFields.map((field) => `    public readonly ${field.propertyName}: ${field.typeName};`),
            ...(binding.createFields.length === 0 ? [] : [""]),
            `    public constructor(contractId: string${constructorParameters.length === 0 ? "" : `, ${constructorParameters.join(", ")}`}) {`,
            "        super(contractId);",
            ...constructorAssignments,
            "    }",
            "",
            `    public static fromCreatedEvent(event: DamlCreatedEventSource): ${binding.className} {`,
            "        const normalized = normalizeDamlCreatedEventSource(event);",
            `        ${binding.className}.assertTemplateIdentity(normalized.metadata.templateId);`,
            `        const fields = materializeDamlValue<${binding.createFieldsTypeName}>(decodeDamlValue(normalized.payload, ${binding.className}.descriptor, generatedDamlTypeDescriptorRegistry, "create arguments"));`,
            `        return new ${binding.className}(`,
            "            normalized.contractId,",
            ...orderedArguments,
            "        );",
            "    }",
            "",
            `    public static fromExercisedEvent(event: DamlExercisedEventSource): ${exercisedReturnType} {`,
            "        const normalized = normalizeDamlExercisedEventSource(event);",
            `        ${binding.className}.assertTemplateIdentity(normalized.metadata.templateId);`,
            "        switch (normalized.choice) {",
            ...binding.choices.map((choice) => `            case ${JSON.stringify(choice.name)}:\n                return ${choice.exercisedEventTypeName}.fromNormalizedEvent(normalized);`),
            "            default:",
            `                throw new DamlMaterializationError("choice", \`Unexpected choice '\${normalized.choice}' for template '${binding.templateIdLiteral}'\`);`,
            "        }",
            "    }",
            "",
            "    private static assertTemplateIdentity(identity: { readonly packageId: string; readonly moduleName: string; readonly entityName: string }): void {",
            `        if (identity.packageId !== ${JSON.stringify(this.packageId(binding))} || identity.moduleName !== ${JSON.stringify(this.moduleName(binding))} || identity.entityName !== ${JSON.stringify(this.entityName(binding))}) {`,
            `            throw new DamlMaterializationError("template ID", \`Expected template '${binding.templateIdLiteral}' but received '\${identity.packageId}:\${identity.moduleName}:\${identity.entityName}'\`);`,
            "        }",
            "    }",
            "}",
        ].join("\n");
    }

    private emitChoiceEventClass(binding: GeneratedTemplateBinding, choice: GeneratedChoiceBinding): string {
        return [
            `export class ${choice.exercisedEventTypeName} {`,
            `    private static readonly argumentDescriptor: DamlTypeDescriptor = ${this.emitDescriptor(choice.parameterType)};`,
            `    private static readonly resultDescriptor: DamlTypeDescriptor = ${this.emitDescriptor(choice.returnType)};`,
            "",
            `    public readonly choiceName = ${JSON.stringify(choice.name)} as const;`,
            "    public readonly contractId: string;",
            `    public readonly argument: ${choice.parameterTypeName};`,
            `    public readonly result: ${choice.returnTypeName};`,
            "    public readonly consuming: boolean;",
            "    public readonly metadata: DamlExercisedEventMetadata;",
            "",
            "    public constructor(contractId: string, argument: " + choice.parameterTypeName + ", result: " + choice.returnTypeName + ", consuming: boolean, metadata: DamlExercisedEventMetadata) {",
            "        this.contractId = contractId;",
            "        this.argument = argument;",
            "        this.result = result;",
            "        this.consuming = consuming;",
            "        this.metadata = metadata;",
            "    }",
            "",
            `    public static fromExercisedEvent(event: DamlExercisedEventSource): ${choice.exercisedEventTypeName} {`,
            "        const normalized = normalizeDamlExercisedEventSource(event);",
            `        ${choice.exercisedEventTypeName}.assertTemplateIdentity(normalized.metadata.templateId);`,
            `        return ${choice.exercisedEventTypeName}.fromNormalizedEvent(normalized);`,
            "    }",
            "",
            `    public static fromNormalizedEvent(event: DamlNormalizedExercisedEvent): ${choice.exercisedEventTypeName} {`,
            `        ${choice.exercisedEventTypeName}.assertTemplateIdentity(event.metadata.templateId);`,
            `        if (event.choice !== ${JSON.stringify(choice.name)}) {`,
            `            throw new DamlMaterializationError("choice", \`Expected choice '${choice.name}' but received '\${event.choice}'\`);`,
            "        }",
            `        const argument = materializeDamlValue<${choice.parameterTypeName}>(decodeDamlValue(event.argument, ${choice.exercisedEventTypeName}.argumentDescriptor, generatedDamlTypeDescriptorRegistry, "choice argument"));`,
            `        const result = materializeDamlValue<${choice.returnTypeName}>(decodeDamlValue(event.result, ${choice.exercisedEventTypeName}.resultDescriptor, generatedDamlTypeDescriptorRegistry, "exercise result"));`,
            `        return new ${choice.exercisedEventTypeName}(event.contractId, argument, result, event.consuming, event.metadata);`,
            "    }",
            "",
            "    private static assertTemplateIdentity(identity: { readonly packageId: string; readonly moduleName: string; readonly entityName: string }): void {",
            `        if (identity.packageId !== ${JSON.stringify(this.packageId(binding))} || identity.moduleName !== ${JSON.stringify(this.moduleName(binding))} || identity.entityName !== ${JSON.stringify(this.entityName(binding))}) {`,
            `            throw new DamlMaterializationError("template ID", \`Expected template '${binding.templateIdLiteral}' but received '\${identity.packageId}:\${identity.moduleName}:\${identity.entityName}'\`);`,
            "        }",
            "    }",
            "}",
        ].join("\n");
    }

    private emitTemplateDescriptor(binding: GeneratedTemplateBinding): string {
        return `{ kind: "record", fields: [${binding.createFields.map((field) =>
            `{ damlLabel: ${JSON.stringify(field.name)}, propertyName: ${JSON.stringify(field.propertyName)}, type: ${this.emitDescriptor(field.type)} }`).join(", ")}] }`;
    }

    private emitDescriptor(type: AnalyzedDamlType): string {
        switch (type.kind) {
            case "primitive":
                return `{ kind: "primitive", primitive: ${JSON.stringify(type.builtinType)}${type.numericScale === undefined ? "" : `, numericScale: ${type.numericScale}`} }`;
            case "contractId":
                return '{ kind: "contractId" }';
            case "optional":
                return `{ kind: "optional", element: ${this.emitDescriptor(type.element)} }`;
            case "list":
                return `{ kind: "list", element: ${this.emitDescriptor(type.element)} }`;
            case "textMap":
                return `{ kind: "textMap", value: ${this.emitDescriptor(type.value)} }`;
            case "genMap":
                return `{ kind: "genMap", key: ${this.emitDescriptor(type.key)}, value: ${this.emitDescriptor(type.value)} }`;
            case "record":
                return `{ kind: "record", fields: [${type.fields.map((field) => `{ damlLabel: ${JSON.stringify(field.damlLabel)}, propertyName: ${JSON.stringify(field.propertyName)}, type: ${this.emitDescriptor(field.type)} }`).join(", ")}] }`;
            case "variant":
                return `{ kind: "variant", constructors: [${type.constructors.map((constructor) => `{ constructor: ${JSON.stringify(constructor.constructor)}, payload: ${this.emitDescriptor(constructor.payload)} }`).join(", ")}] }`;
            case "enum":
                return `{ kind: "enum", constructors: [${type.constructors.map((constructor) => JSON.stringify(constructor)).join(", ")}] }`;
            case "namedReference":
                return `{ kind: "namedReference", identity: { packageId: ${JSON.stringify(type.identity.packageId)}, moduleName: ${JSON.stringify(type.identity.moduleName)}, entityName: ${JSON.stringify(type.identity.name)} } }`;
        }
    }

    private getTypeName(
        type: AnalyzedDamlType,
        namedReferences: ReadonlyMap<string, ResolvedNamedReference>,
    ): string {
        switch (type.kind) {
            case "primitive":
                return this.getPrimitiveTypeName(type.builtinType);
            case "contractId":
                return "string";
            case "optional":
                return `${this.getTypeName(type.element, namedReferences)} | undefined`;
            case "list":
                return `readonly ${this.getTypeName(type.element, namedReferences)}[]`;
            case "textMap":
                return `ReadonlyMap<string, ${this.getTypeName(type.value, namedReferences)}>`;
            case "genMap":
                return `ReadonlyMap<${this.getTypeName(type.key, namedReferences)}, ${this.getTypeName(type.value, namedReferences)}>`;
            case "record":
                return `{ ${type.fields.map((field) => `readonly ${field.propertyName}: ${this.getTypeName(field.type, namedReferences)};`).join(" ")} }`;
            case "variant":
                return type.constructors.map((constructor) =>
                    `{ readonly tag: ${JSON.stringify(constructor.constructor)}; readonly value: ${this.getTypeName(constructor.payload, namedReferences)}; }`).join(" | ");
            case "enum":
                return type.constructors.map((constructor) => JSON.stringify(constructor)).join(" | ");
            case "namedReference":
                return this.getNamedReference(type.identity, namedReferences).alias;
        }
    }

    private getPrimitiveTypeName(type: DamlLfBuiltinType): string {
        switch (type) {
            case DamlLfBuiltinType.unit: return "DamlUnit";
            case DamlLfBuiltinType.bool: return "boolean";
            case DamlLfBuiltinType.int64: return "bigint";
            case DamlLfBuiltinType.date: return "DamlDate";
            case DamlLfBuiltinType.timestamp: return "DamlTimestamp";
            case DamlLfBuiltinType.numeric: return "DamlNumeric";
            case DamlLfBuiltinType.party: return "DamlParty";
            case DamlLfBuiltinType.text: return "string";
            default: throw new Error(`Cannot emit unsupported primitive DAML type '${type}'`);
        }
    }

    private normalizeType(type: AnalyzedDamlType | DamlLfType): AnalyzedDamlType {
        if ("kind" in type) {
            return type;
        }

        if (type.builtinType === DamlLfBuiltinType.contractId) {
            if (type.typeArguments.length !== 1) {
                throw new Error("DAML ContractId requires exactly one type argument");
            }

            return { kind: "contractId" };
        }

        const arguments_ = type.typeArguments.map((argument) => this.normalizeType(argument));

        if (type.typeConReference !== undefined) {
            return { kind: "namedReference", identity: type.typeConReference };
        }

        switch (type.builtinType) {
            case DamlLfBuiltinType.optional:
                return { kind: "optional", element: arguments_[0] ?? { kind: "primitive", builtinType: DamlLfBuiltinType.text } };
            case DamlLfBuiltinType.list:
                return { kind: "list", element: arguments_[0] ?? { kind: "primitive", builtinType: DamlLfBuiltinType.text } };
            case DamlLfBuiltinType.textMap:
                return { kind: "textMap", value: arguments_[0] ?? { kind: "primitive", builtinType: DamlLfBuiltinType.text } };
            case DamlLfBuiltinType.genMap:
                return { kind: "genMap", key: arguments_[0] ?? { kind: "primitive", builtinType: DamlLfBuiltinType.text }, value: arguments_[1] ?? { kind: "primitive", builtinType: DamlLfBuiltinType.text } };
            case DamlLfBuiltinType.unit:
            case DamlLfBuiltinType.bool:
            case DamlLfBuiltinType.int64:
            case DamlLfBuiltinType.date:
            case DamlLfBuiltinType.timestamp:
            case DamlLfBuiltinType.numeric:
            case DamlLfBuiltinType.party:
            case DamlLfBuiltinType.text:
                return { kind: "primitive", builtinType: type.builtinType, numericScale: type.numericScale };
            case DamlLfBuiltinType.unknown:
                throw new Error("Cannot emit an unknown DAML type");
            default:
                throw new Error("Cannot emit unsupported DAML type");
        }
    }

    private resolveNamedReferences(
        template: AnalyzedTemplate,
        namedTypeFiles: readonly GeneratedNamedTypeFile[],
    ): ReadonlyMap<string, ResolvedNamedReference> {
        const identities = new Map<string, NamedReference>();

        for (const type of [
            ...template.createFields.map((field) => this.normalizeType(field.type)),
            ...template.choices.flatMap((choice) => [
                this.normalizeType(choice.parameterType),
                this.normalizeType(choice.returnType),
            ]),
        ]) {
            for (const reference of this.walkNamedReferences(type)) {
                identities.set(this.getNamedReferenceKey(reference.identity), reference);
            }
        }

        const aliases = new Map<string, string>();

        const usedAliases = new Set<string>();

        for (const [key, reference] of [...identities.entries()].sort(([left], [right]) => left.localeCompare(right))) {
            const file = namedTypeFiles.find((candidate) =>
                candidate.packageId === reference.identity.packageId
                && candidate.moduleName === reference.identity.moduleName);

            const exportedName = file?.exportedTypeNamesByIdentity.get(key);

            if (file === undefined || exportedName === undefined) {
                if (namedTypeFiles.length !== 0) {
                    throw new Error(`Cannot emit unresolved named DAML type '${reference.identity.name}'`);
                }

                aliases.set(key, reference.identity.name);

                continue;
            }

            const baseAlias = this.toTypeName(
                `${reference.identity.packageId} ${reference.identity.moduleName} ${exportedName}`,
            );

            let alias = baseAlias;

            let escalation = 2;

            while (usedAliases.has(alias)) {
                alias = `${baseAlias}_${this.shortHash(key)}_${escalation}`;
                escalation += 1;
            }

            usedAliases.add(alias);
            aliases.set(key, alias);
        }

        return new Map([...identities.entries()].map(([key, reference]) => {
            const file = namedTypeFiles.find((candidate) =>
                candidate.packageId === reference.identity.packageId
                && candidate.moduleName === reference.identity.moduleName);

            const exportedName = file?.exportedTypeNamesByIdentity.get(key);

            const alias = aliases.get(key);

            if (file === undefined || exportedName === undefined) {
                return [key, {
                    path: "",
                    exportedName: reference.identity.name,
                    alias: alias ?? reference.identity.name,
                }];
            }

            return [key, {
                path: this.relativeFilePath(this.nameResolver.getTemplateFilePath(template), file.path),
                exportedName,
                alias: alias!,
            }];
        }));
    }

    private *walkNamedReferences(type: AnalyzedDamlType): Iterable<NamedReference> {
        switch (type.kind) {
            case "namedReference": yield type;

            return;
            case "contractId": return;
            case "optional":
            case "list": yield* this.walkNamedReferences(type.element);

            return;
            case "textMap": yield* this.walkNamedReferences(type.value);

            return;
            case "genMap": yield* this.walkNamedReferences(type.key); yield* this.walkNamedReferences(type.value);

            return;
            case "record": for (const field of type.fields) {
                yield* this.walkNamedReferences(field.type);
            }

            return;
            case "variant": for (const constructor of type.constructors) {
                yield* this.walkNamedReferences(constructor.payload);
            }

            return;
            case "primitive":
            case "enum": return;
        }
    }

    private getNamedReference(
        identity: { readonly packageId: string; readonly moduleName: string; readonly name: string },
        namedReferences: ReadonlyMap<string, ResolvedNamedReference>,
    ): ResolvedNamedReference {
        const reference = namedReferences.get(this.getNamedReferenceKey(identity));

        if (reference === undefined) {
            throw new Error(`Cannot resolve named DAML type '${identity.name}'`);
        }

        return reference;
    }

    private getNamedReferenceKey(identity: { readonly packageId: string; readonly moduleName: string; readonly name: string }): string {
        return `${identity.packageId}\u0000${identity.moduleName}\u0000${identity.name}`;
    }

    private toTypeName(value: string): string {
        const normalized = value.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[^A-Za-z0-9]+/g, " ").trim();

        const name = normalized.split(/\s+/).map((part) => `${part[0]?.toUpperCase()}${part.slice(1)}`).join("");

        return /^[0-9]/.test(name) ? `_${name}` : name;
    }

    private shortHash(value: string): string {
        let hash = 0x811c9dc5;

        for (const character of value) {
            hash ^= character.charCodeAt(0);
            hash = Math.imul(hash, 0x01000193);
        }

        return (hash >>> 0).toString(36).padStart(6, "0").slice(-6);
    }

    private packageId(binding: GeneratedTemplateBinding): string {
        return binding.templateIdLiteral.split(":")[0]!;
    }
    private moduleName(binding: GeneratedTemplateBinding): string {
        return binding.templateIdLiteral.split(":")[1]!;
    }
    private entityName(binding: GeneratedTemplateBinding): string {
        return binding.templateIdLiteral.split(":")[2]!;
    }

    private relativeFilePath(fromPath: string, toPath: string): string {
        const from = fromPath.split("/").slice(0, -1);

        const to = toPath.split("/");

        while (from[0] === to[0] && from.length > 0) {
            from.shift();
            to.shift();
        }

        const relative = from.map(() => "..").concat(to).join("/") || ".";

        return `${relative.startsWith(".") ? relative : `./${relative}`}`.replace(/\.ts$/, ".js");
    }
}
