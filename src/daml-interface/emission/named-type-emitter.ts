import { DamlLfBuiltinType } from "../../daml-lf/model/daml-lf-builtin-type.js";
import { AnalyzedDamlType } from "../analysis/analyzed-daml-type.js";
import { AnalyzedDamlTypeDefinition } from "../analysis/analyzed-daml-type-definition.js";
import { DamlInterfacePackageMetadata } from "../analysis/daml-interface-analyzer.js";
import { GeneratedNamedTypeFile } from "../emission-model/generated-named-type-file.js";
import { GeneratedTemplateBindingFile } from "../emission-model/generated-template-binding-file.js";
import { TypeScriptNameResolver } from "./type-script-name-resolver.js";
import { type DamlModuleImportStyle } from "./daml-module-import-style.js";
import { RelativeModuleSpecifier } from "./relative-module-specifier.js";

type ModuleIdentity = {
    readonly packageId: string;
    readonly moduleName: string;
};

type ResolvedModule = ModuleIdentity & {
    readonly key: string;
    readonly path: string;
    readonly namespaceAlias: string;
};

type ExternalTypeAliases = ReadonlyMap<string, string>;

type TypeParameterNames = ReadonlyMap<string, string>;

/** Emits TypeScript declarations for reachable named DAML records, variants, and enums. */
export class NamedTypeEmitter {
    public constructor(
        private readonly nameResolver: TypeScriptNameResolver = new TypeScriptNameResolver(),
    ) {
        void this.nameResolver;
    }

    /** Prepares shared package/module output mappings with template emission. */
    public prepareProjectOrThrow(
        templates: readonly import("../analysis/analyzed-template.js").AnalyzedTemplate[],
        definitions: readonly AnalyzedDamlTypeDefinition[],
        packageMetadata: ReadonlyMap<string, DamlInterfacePackageMetadata> = new Map(),
    ): void {
        this.nameResolver.prepareProjectOrThrow(
            templates,
            definitions,
            packageMetadata,
        );
    }

    /** Emits one `types.ts` module for every reachable DAML package/module identity. */
    public emitNamedTypeFiles(
        definitions: readonly AnalyzedDamlTypeDefinition[],
        moduleImportStyle?: DamlModuleImportStyle,
    ): readonly GeneratedNamedTypeFile[] {
        this.nameResolver.prepareProjectOrThrow([], definitions);

        return this.emitPreparedNamedTypeFiles(definitions, [], moduleImportStyle);
    }

    /** Emits named type files from an already prepared shared name resolver. */
    public emitPreparedNamedTypeFiles(
        definitions: readonly AnalyzedDamlTypeDefinition[],
        templateFiles: readonly GeneratedTemplateBindingFile[] = [],
        moduleImportStyle?: DamlModuleImportStyle,
    ): readonly GeneratedNamedTypeFile[] {
        const modules = this.resolveModulesOrThrow(definitions);

        const names = this.resolveDefinitionNamesOrThrow(
            definitions,
            this.mergeReservedNames(
                this.getReservedModuleExports(templateFiles),
                this.getReservedRuntimeBindings(definitions),
            ),
        );

        const fieldPropertyNames = this.resolveFieldPropertyNames(definitions);

        return [...modules.values()].map((module) => {
            const moduleDefinitions = definitions.filter((definition) =>
                definition.identity.packageId === module.packageId
                && definition.identity.moduleName === module.moduleName);

            const externalTypeAliases = this.resolveExternalTypeAliases(
                module,
                moduleDefinitions,
                modules,
                names,
            );

            const typeParameterNames = this.resolveTypeParameterNames(
                moduleDefinitions,
                names,
                externalTypeAliases,
            );

            const imports = this.emitImports(
                module,
                moduleDefinitions,
                modules,
                names,
                externalTypeAliases,
                moduleImportStyle,
            );

            return new GeneratedNamedTypeFile({
                path: module.path,
                contents: [
                    ...imports,
                    ...(imports.length === 0 ? [] : [""]),
                    ...moduleDefinitions.map((definition) =>
                        this.emitDefinition(definition, names, externalTypeAliases, fieldPropertyNames, typeParameterNames)),
                    "",
                ].join("\n"),
                packageId: module.packageId,
                moduleName: module.moduleName,
                namespaceAlias: module.namespaceAlias,
                exportedTypeNames: moduleDefinitions.map((definition) =>
                    this.getDefinitionName(definition, names)),
                exportedTypeNamesByIdentity: new Map(moduleDefinitions.map((definition) => [
                    this.getDefinitionKey(
                        definition.identity.packageId,
                        definition.identity.moduleName,
                        definition.identity.name,
                    ),
                    this.getDefinitionName(definition, names),
                ])),
                fieldPropertyNames: new Map([...fieldPropertyNames.entries()].filter(([key]) =>
                    key.startsWith(`${module.key}\u0000`))),
            });
        });
    }

    private emitDefinition(
        definition: AnalyzedDamlTypeDefinition,
        names: ReadonlyMap<string, string>,
        externalTypeAliases: ExternalTypeAliases,
        fieldPropertyNames: ReadonlyMap<string, string>,
        typeParameterNames: TypeParameterNames,
    ): string {
        const name = this.getDefinitionName(definition, names);

        const parameters = this.getDefinitionTypeParameters(definition, typeParameterNames);

        const declarationName = `${name}${parameters.length === 0 ? "" : `<${parameters.join(", ")}>`}`;

        if (definition.kind === "record") {
            return [
                `export interface ${declarationName} {`,
                ...definition.fields.map((field, index) =>
                    `    readonly ${this.getFieldPropertyName(definition, index, fieldPropertyNames)}: ${this.getTypeName(field.type, definition, names, externalTypeAliases, typeParameterNames)};`),
                "}",
            ].join("\n");
        } else if (definition.kind === "variant") {
            return [
                `export type ${declarationName} =`,
                ...definition.constructors.map((constructor) =>
                    `    | { readonly tag: ${JSON.stringify(constructor.constructor)}; readonly value: ${this.getTypeName(constructor.payload, definition, names, externalTypeAliases, typeParameterNames)}; }`),
            ].map((line, index, lines) => index === lines.length - 1 ? `${line};` : line).join("\n");
        }

        return `export type ${name} = ${definition.constructors.map((constructor) => JSON.stringify(constructor)).join(" | ")};`;
    }

    private emitImports(
        module: ResolvedModule,
        definitions: readonly AnalyzedDamlTypeDefinition[],
        modules: ReadonlyMap<string, ResolvedModule>,
        names: ReadonlyMap<string, string>,
        externalTypeAliases: ExternalTypeAliases,
        moduleImportStyle?: DamlModuleImportStyle,
    ): readonly string[] {
        const imports = new Map<string, Map<string, string>>();

        const runtimeTypes = new Set<string>();

        for (const definition of definitions) {
            for (const primitive of this.getRuntimePrimitiveTypes(definition)) {
                runtimeTypes.add(primitive);
            }

            for (const reference of this.getNamedReferences(definition)) {
                const referencedModuleKey = this.getModuleKey(reference.identity.packageId, reference.identity.moduleName);

                if (referencedModuleKey === module.key) {
                    continue;
                }

                const referencedModule = modules.get(referencedModuleKey);

                if (referencedModule === undefined) {
                    throw new Error(`Cannot emit unresolved named DAML type '${reference.identity.name}'`);
                }

                const importPath = this.relativeFilePath(module.path, referencedModule.path, moduleImportStyle);

                const importedNames = imports.get(importPath) ?? new Map<string, string>();

                importedNames.set(
                    this.getNamedReferenceTypeName(reference.identity, names),
                    this.getExternalTypeAlias(reference.identity, externalTypeAliases),
                );
                imports.set(importPath, importedNames);
            }
        }

        return [
            ...(runtimeTypes.size === 0 ? [] : [
                `import type { ${[...runtimeTypes].sort().join(", ")} } from ${JSON.stringify(this.relativeFilePath(module.path, "generated/support/runtime.ts", moduleImportStyle))};`,
            ]),
            ...[...imports.entries()]
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([path, importedNames]) =>
                `import type { ${[...importedNames.entries()]
                    .sort(([left], [right]) => left.localeCompare(right))
                    .map(([exportedName, alias]) => exportedName === alias
                        ? exportedName
                        : `${exportedName} as ${alias}`)
                    .join(", ")} } from ${JSON.stringify(path)};`),
        ];
    }

    private resolveExternalTypeAliases(
        module: ResolvedModule,
        definitions: readonly AnalyzedDamlTypeDefinition[],
        modules: ReadonlyMap<string, ResolvedModule>,
        names: ReadonlyMap<string, string>,
    ): ExternalTypeAliases {
        const references = new Map<string, { packageId: string; moduleName: string; name: string }>();

        for (const definition of definitions) {
            for (const reference of this.getNamedReferences(definition)) {
                const moduleKey = this.getModuleKey(
                    reference.identity.packageId,
                    reference.identity.moduleName,
                );

                if (moduleKey !== module.key) {
                    const key = this.getDefinitionKey(
                        reference.identity.packageId,
                        reference.identity.moduleName,
                        reference.identity.name,
                    );

                    references.set(key, reference.identity);
                }
            }
        }

        const aliases = new Map<string, string>();

        const usedNames = new Set(definitions.map((definition) =>
            this.getDefinitionName(definition, names)));

        for (const [key, identity] of [...references.entries()].sort(([left], [right]) => left.localeCompare(right))) {
            const referencedModule = modules.get(this.getModuleKey(
                identity.packageId,
                identity.moduleName,
            ));

            if (referencedModule === undefined) {
                throw new Error(`Cannot emit unresolved named DAML type '${identity.name}'`);
            }

            const exportedName = this.getNamedReferenceTypeName(identity, names);

            const baseName = this.safeTypeName(
                `${referencedModule.namespaceAlias} ${exportedName}`,
            );

            let alias = exportedName;

            let escalation = 2;

            if (usedNames.has(alias)) {
                alias = baseName;
            }

            while (usedNames.has(alias)) {
                alias = `${baseName}_${this.shortHash(key)}_${escalation}`;
                escalation += 1;
            }

            usedNames.add(alias);
            aliases.set(key, alias);
        }

        return aliases;
    }

    private getExternalTypeAlias(
        identity: { readonly packageId: string; readonly moduleName: string; readonly name: string },
        aliases: ExternalTypeAliases,
    ): string {
        const alias = aliases.get(this.getDefinitionKey(
            identity.packageId,
            identity.moduleName,
            identity.name,
        ));

        if (alias === undefined) {
            throw new Error(`Cannot resolve external named DAML type '${identity.name}'`);
        }

        return alias;
    }

    private *getNamedReferences(type: AnalyzedDamlType): Iterable<Extract<AnalyzedDamlType, { readonly kind: "namedReference" }>> {
        switch (type.kind) {
            case "namedReference":
                yield type;

                for (const typeArgument of type.typeArguments ?? []) {
                    yield* this.getNamedReferences(typeArgument);
                }

                return;
            case "contractId": return;
            case "optional":
            case "list":
                yield* this.getNamedReferences(type.element);

                return;
            case "textMap":
                yield* this.getNamedReferences(type.value);

                return;
            case "genMap":
                yield* this.getNamedReferences(type.key);
                yield* this.getNamedReferences(type.value);

                return;
            case "record":
                for (const field of type.fields) {
                    yield* this.getNamedReferences(field.type);
                }

                return;
            case "variant":
                for (const constructor of type.constructors) {
                    yield* this.getNamedReferences(constructor.payload);
                }

                return;
            case "primitive":
            case "enum":
            case "typeVariable":
                return;
        }
    }

    private getTypeName(
        type: AnalyzedDamlType,
        definition: AnalyzedDamlTypeDefinition,
        names: ReadonlyMap<string, string>,
        externalTypeAliases: ExternalTypeAliases,
        typeParameterNames: TypeParameterNames,
    ): string {
        switch (type.kind) {
            case "primitive":
                return this.getPrimitiveTypeName(type.builtinType);
            case "contractId":
                return "string";
            case "optional":
                return `${this.getTypeName(type.element, definition, names, externalTypeAliases, typeParameterNames)} | undefined`;
            case "list":
                return `readonly ${this.getArrayElementTypeName(type.element, definition, names, externalTypeAliases, typeParameterNames)}[]`;
            case "textMap":
                return `ReadonlyMap<string, ${this.getTypeName(type.value, definition, names, externalTypeAliases, typeParameterNames)}>`;
            case "genMap":
                return `ReadonlyMap<${this.getTypeName(type.key, definition, names, externalTypeAliases, typeParameterNames)}, ${this.getTypeName(type.value, definition, names, externalTypeAliases, typeParameterNames)}>`;
            case "record":
            case "variant":
            case "enum":
                throw new Error("Named DAML declarations must not contain anonymous record, variant, or enum shapes");
            case "typeVariable":
                return this.getTypeParameterName(definition, type, typeParameterNames);
            case "namedReference": {
                const name = externalTypeAliases.get(this.getDefinitionKey(
                    type.identity.packageId,
                    type.identity.moduleName,
                    type.identity.name,
                )) ?? this.getNamedReferenceTypeName(type.identity, names);

                return (type.typeArguments?.length ?? 0) === 0
                    ? name
                    : `${name}<${(type.typeArguments ?? []).map((argument) =>
                        this.getTypeName(argument, definition, names, externalTypeAliases, typeParameterNames)).join(", ")}>`;
            }
        }
    }

    private getArrayElementTypeName(
        type: AnalyzedDamlType,
        definition: AnalyzedDamlTypeDefinition,
        names: ReadonlyMap<string, string>,
        externalTypeAliases: ExternalTypeAliases,
        typeParameterNames: TypeParameterNames,
    ): string {
        const name = this.getTypeName(type, definition, names, externalTypeAliases, typeParameterNames);

        return type.kind === "optional" || type.kind === "variant" || type.kind === "enum"
            ? `(${name})`
            : name;
    }

    private getPrimitiveTypeName(type: DamlLfBuiltinType): string {
        switch (type) {
            case DamlLfBuiltinType.unit:
                return "DamlUnit";
            case DamlLfBuiltinType.bool:
                return "boolean";
            case DamlLfBuiltinType.int64:
                return "bigint";
            case DamlLfBuiltinType.date:
                return "DamlDate";
            case DamlLfBuiltinType.timestamp:
                return "DamlTimestamp";
            case DamlLfBuiltinType.numeric:
                return "DamlNumeric";
            case DamlLfBuiltinType.party:
                return "DamlParty";
            case DamlLfBuiltinType.text:
                return "string";
            default:
                throw new Error(`Cannot emit unsupported primitive DAML type '${type}'`);
        }
    }

    private resolveTypeParameterNames(
        definitions: readonly AnalyzedDamlTypeDefinition[],
        names: ReadonlyMap<string, string>,
        externalTypeAliases: ExternalTypeAliases,
    ): TypeParameterNames {
        const values = definitions.flatMap((definition) => this.getTypeParameters(definition).map((parameter) => ({
            definition,
            parameter,
        })));

        const moduleBindings = new Set<string>([
            ...definitions.map((definition) => this.getDefinitionName(definition, names)),
            ...externalTypeAliases.values(),
        ]);

        for (const definition of definitions) {
            for (const runtimeType of this.getRuntimePrimitiveTypes(definition)) {
                moduleBindings.add(runtimeType);
            }
        }

        const reservedNamesByDefinition = new Map<string, ReadonlySet<string>>(
            definitions.map((definition) => [
                this.getDefinitionKey(
                    definition.identity.packageId,
                    definition.identity.moduleName,
                    definition.identity.name,
                ),
                moduleBindings,
            ]),
        );

        const resolved = this.resolveCollisionSafeNames(
            values,
            ({ parameter }) => this.safeTypeName(parameter.name ?? `T${parameter.internedStringIndex}`),
            ({ definition }) => this.getDefinitionKey(
                definition.identity.packageId,
                definition.identity.moduleName,
                definition.identity.name,
            ),
            "_",
            reservedNamesByDefinition,
        );

        return new Map(values.map((value) => [
            this.getTypeParameterKey(value.definition, value.parameter.internedStringIndex),
            resolved.get(value)!,
        ]));
    }

    private getDefinitionTypeParameters(
        definition: AnalyzedDamlTypeDefinition,
        typeParameterNames: TypeParameterNames,
    ): readonly string[] {
        return this.getTypeParameters(definition).map((parameter) =>
            this.getTypeParameterName(definition, parameter, typeParameterNames));
    }

    private getTypeParameterName(
        definition: AnalyzedDamlTypeDefinition,
        parameter: { readonly internedStringIndex: number },
        typeParameterNames: TypeParameterNames,
    ): string {
        const name = typeParameterNames.get(this.getTypeParameterKey(
            definition,
            parameter.internedStringIndex,
        ));

        if (name === undefined) {
            throw new Error(`Cannot resolve generic parameter '${parameter.internedStringIndex}' for '${definition.identity.name}'`);
        }

        return name;
    }

    private getTypeParameters(
        definition: AnalyzedDamlTypeDefinition,
    ): readonly import("../../daml-lf/model/daml-lf-data-type.js").DamlLfTypeParameter[] {
        return definition.kind === "enum" ? [] : definition.typeParameters ?? [];
    }

    private getTypeParameterKey(
        definition: AnalyzedDamlTypeDefinition,
        internedStringIndex: number,
    ): string {
        return `${this.getDefinitionKey(
            definition.identity.packageId,
            definition.identity.moduleName,
            definition.identity.name,
        )}\u0000type-parameter\u0000${internedStringIndex}`;
    }

    private resolveModulesOrThrow(
        definitions: readonly AnalyzedDamlTypeDefinition[],
    ): ReadonlyMap<string, ResolvedModule> {
        const identities = new Map<string, ModuleIdentity>();

        for (const definition of definitions) {
            const key = this.getModuleKey(definition.identity.packageId, definition.identity.moduleName);

            identities.set(key, {
                packageId: definition.identity.packageId,
                moduleName: definition.identity.moduleName,
            });
        }

        return new Map([...identities.entries()].map(([key, identity]) => [
            key,
            {
                ...identity,
                key,
                path: `${this.nameResolver.getNamedTypeModuleDirectoryPath(identity.packageId, identity.moduleName)}/types.ts`,
                namespaceAlias: this.nameResolver.getNamedTypeModuleNamespaceAlias(identity.packageId, identity.moduleName),
            },
        ]));
    }

    private resolveDefinitionNamesOrThrow(
        definitions: readonly AnalyzedDamlTypeDefinition[],
        reservedNamesByModule: ReadonlyMap<string, ReadonlySet<string>>,
    ): ReadonlyMap<string, string> {
        const values = definitions.map((definition) => [
            this.getDefinitionKey(definition.identity.packageId, definition.identity.moduleName, definition.identity.name),
            definition,
        ] as const);

        const duplicate = new Set<string>();

        for (const [key] of values) {
            if (duplicate.has(key)) {
                throw new Error(`Cannot emit duplicate named DAML type '${key.replaceAll("\u0000", ":")}'`);
            }

            duplicate.add(key);
        }

        const resolvedNames = this.resolveCollisionSafeNames(
            values,
            ([, definition]) => this.safeTypeName(definition.identity.name),
            ([, definition]) => this.getModuleKey(definition.identity.packageId, definition.identity.moduleName),
            "_",
            reservedNamesByModule,
        );

        return new Map(values.map((value) => [
            value[0],
            resolvedNames.get(value)!,
        ]));
    }

    private resolveCollisionSafeNames<T>(
        values: readonly T[],
        getBaseName: (value: T) => string,
        getScope: (value: T) => string,
        collisionSeparator = "_",
        reservedNamesByScope: ReadonlyMap<string, ReadonlySet<string>> = new Map(),
    ): ReadonlyMap<T, string> {
        const counts = new Map<string, number>();

        for (const value of values) {
            const key = `${getScope(value)}\u0000${getBaseName(value)}`;

            counts.set(key, (counts.get(key) ?? 0) + 1);
        }

        const names = new Map<T, string>();

        const allocated = new Map<string, Set<string>>();

        for (const value of [...values].sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)))) {
            const scope = getScope(value);

            const baseName = getBaseName(value);

            const groupKey = `${scope}\u0000${baseName}`;

            const suffix = counts.get(groupKey) === 1 ? "" : `${collisionSeparator}${this.shortHash(JSON.stringify(value))}`;

            const baseCandidate = `${baseName}${suffix}`;

            const used = allocated.get(scope) ?? new Set<string>(reservedNamesByScope.get(scope));

            let candidate = used.has(baseCandidate) ? `${baseCandidate}Type` : baseCandidate;

            let escalation = 2;

            while (used.has(candidate)) {
                candidate = `${baseCandidate}_${escalation}`;
                escalation += 1;
            }

            used.add(candidate);
            allocated.set(scope, used);
            names.set(value, candidate);
        }

        return names;
    }

    private getReservedModuleExports(
        templateFiles: readonly GeneratedTemplateBindingFile[],
    ): ReadonlyMap<string, ReadonlySet<string>> {
        const exportsByModule = new Map<string, Set<string>>();

        for (const file of templateFiles) {
            const binding = file.binding;

            const moduleKey = this.getModuleKeyFromTemplateIdentity(binding.templateIdentityKey);

            const exports = exportsByModule.get(moduleKey) ?? new Set<string>();

            exports.add(binding.className);
            exports.add(binding.createFieldsTypeName);
            exports.add(binding.createdEventTypeName);

            for (const choice of binding.choices) {
                exports.add(choice.choiceTypeName);
                exports.add(choice.exercisedEventTypeName);
            }

            exportsByModule.set(moduleKey, exports);
        }

        return exportsByModule;
    }

    private getReservedRuntimeBindings(
        definitions: readonly AnalyzedDamlTypeDefinition[],
    ): ReadonlyMap<string, ReadonlySet<string>> {
        const bindings = new Set([
            "DamlDate",
            "DamlNumeric",
            "DamlParty",
            "DamlTimestamp",
            "DamlUnit",
        ]);

        return new Map([...new Set(definitions.map((definition) =>
            this.getModuleKey(definition.identity.packageId, definition.identity.moduleName)))].map((moduleKey) => [
            moduleKey,
            bindings,
        ]));
    }

    private mergeReservedNames(
        ...reservations: readonly ReadonlyMap<string, ReadonlySet<string>>[]
    ): ReadonlyMap<string, ReadonlySet<string>> {
        const merged = new Map<string, Set<string>>();

        for (const reservation of reservations) {
            for (const [moduleKey, names] of reservation) {
                const mergedNames = merged.get(moduleKey) ?? new Set<string>();

                for (const name of names) {
                    mergedNames.add(name);
                }

                merged.set(moduleKey, mergedNames);
            }
        }

        return merged;
    }

    private resolveFieldPropertyNames(
        definitions: readonly AnalyzedDamlTypeDefinition[],
    ): ReadonlyMap<string, string> {
        const fields = definitions.flatMap((definition) => definition.kind === "record"
            ? definition.fields.map((field, index) => ({ definition, field, index }))
            : []);

        const counts = new Map<string, number>();

        for (const item of fields) {
            const baseName = this.safePropertyName(item.field.propertyName);

            const groupKey = `${this.getDefinitionKey(
                item.definition.identity.packageId,
                item.definition.identity.moduleName,
                item.definition.identity.name,
            )}\u0000${baseName}`;

            counts.set(groupKey, (counts.get(groupKey) ?? 0) + 1);
        }

        const names = new Map<string, string>();

        for (const item of [...fields].sort((left, right) =>
            this.getFieldKey(left.definition, left.index).localeCompare(
                this.getFieldKey(right.definition, right.index),
            ))) {
            const baseName = this.safePropertyName(item.field.propertyName);

            const definitionKey = this.getDefinitionKey(
                item.definition.identity.packageId,
                item.definition.identity.moduleName,
                item.definition.identity.name,
            );

            const groupKey = `${definitionKey}\u0000${baseName}`;

            const name = counts.get(groupKey) === 1
                ? baseName
                : `${baseName}_${this.shortHash(this.getFieldKey(item.definition, item.index))}`;

            names.set(this.getFieldKey(item.definition, item.index), name);
        }

        return names;
    }

    private getFieldPropertyName(
        definition: AnalyzedDamlTypeDefinition,
        index: number,
        names: ReadonlyMap<string, string>,
    ): string {
        const name = names.get(this.getFieldKey(definition, index));

        if (name === undefined) {
            throw new Error(`Cannot resolve property name for named DAML type '${definition.identity.name}'`);
        }

        return name;
    }

    private getFieldKey(definition: AnalyzedDamlTypeDefinition, index: number): string {
        return `${this.getDefinitionKey(
            definition.identity.packageId,
            definition.identity.moduleName,
            definition.identity.name,
        )}\u0000field\u0000${index}`;
    }

    private safePropertyName(value: string): string {
        const name = value.replace(/[^A-Za-z0-9_$]/g, "_");

        if (name.length === 0) {
            return "field";
        }

        return /^[0-9]/.test(name) ? `_${name}` : name;
    }

    private getModuleKeyFromTemplateIdentity(identityKey: string): string {
        const [packageId, moduleName] = identityKey.split("\u0000");

        return this.getModuleKey(packageId, moduleName);
    }

    private relativeFilePath(
        fromPath: string,
        toPath: string,
        moduleImportStyle?: DamlModuleImportStyle,
    ): string {
        return RelativeModuleSpecifier.fromPaths(fromPath, toPath, moduleImportStyle);
    }

    private getDefinitionName(definition: AnalyzedDamlTypeDefinition, names: ReadonlyMap<string, string>): string {
        return this.getNamedReferenceTypeName(definition.identity, names);
    }

    private getNamedReferenceTypeName(
        identity: { readonly packageId: string; readonly moduleName: string; readonly name: string },
        names: ReadonlyMap<string, string>,
    ): string {
        const name = names.get(this.getDefinitionKey(identity.packageId, identity.moduleName, identity.name));

        if (name === undefined) {
            throw new Error(`Cannot emit unresolved named DAML type '${identity.name}'`);
        }

        return name;
    }

    private getModuleKey(packageId: string, moduleName: string): string {
        return `${packageId}\u0000${moduleName}`;
    }

    private getDefinitionKey(packageId: string, moduleName: string, name: string): string {
        return `${this.getModuleKey(packageId, moduleName)}\u0000${name}`;
    }

    private safeTypeName(value: string): string {
        const normalized = value.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[^A-Za-z0-9]+/g, " ").trim();

        if (normalized.length === 0) {
            throw new Error("Cannot normalize an empty DAML identifier");
        }

        const name = normalized.split(/\s+/).map((segment) => `${segment[0].toUpperCase()}${segment.slice(1)}`).join("");

        return /^[0-9]/.test(name) ? `_${name}` : name;
    }

    private *getRuntimePrimitiveTypes(type: AnalyzedDamlType): Iterable<string> {
        switch (type.kind) {
            case "primitive": {
                const name = this.getPrimitiveTypeName(type.builtinType);

                if (name.startsWith("Daml")) {
                    yield name;
                }

                return;
            }
            case "contractId": return;
            case "optional":
            case "list":
                yield* this.getRuntimePrimitiveTypes(type.element);

                return;
            case "textMap":
                yield* this.getRuntimePrimitiveTypes(type.value);

                return;
            case "genMap":
                yield* this.getRuntimePrimitiveTypes(type.key);
                yield* this.getRuntimePrimitiveTypes(type.value);

                return;
            case "record":
                for (const field of type.fields) {
                    yield* this.getRuntimePrimitiveTypes(field.type);
                }

                return;
            case "variant":
                for (const constructor of type.constructors) {
                    yield* this.getRuntimePrimitiveTypes(constructor.payload);
                }

                return;
            case "enum":
            case "typeVariable":
                return;
            case "namedReference":
                for (const typeArgument of type.typeArguments ?? []) {
                    yield* this.getRuntimePrimitiveTypes(typeArgument);
                }

                return;
        }
    }

    private shortHash(value: string): string {
        let hash = 0x811c9dc5;

        for (const character of value) {
            hash ^= character.charCodeAt(0);
            hash = Math.imul(hash, 0x01000193);
        }

        return (hash >>> 0).toString(36).padStart(6, "0").slice(-6);
    }
}
