import { DamlLfBuiltinType } from "../../daml-lf/model/daml-lf-builtin-type.js";
import { AnalyzedDamlType } from "../analysis/analyzed-daml-type.js";
import { AnalyzedDamlTypeDefinition } from "../analysis/analyzed-daml-type-definition.js";
import { GeneratedNamedTypeFile } from "../emission-model/generated-named-type-file.js";

type ModuleIdentity = {
    readonly packageId: string;
    readonly moduleName: string;
};

type ResolvedModule = ModuleIdentity & {
    readonly key: string;
    readonly path: string;
    readonly namespaceAlias: string;
};

/** Emits TypeScript declarations for reachable named DAML records, variants, and enums. */
export class NamedTypeEmitter {
    /** Emits one `types.ts` module for every reachable DAML package/module identity. */
    public emitNamedTypeFiles(
        definitions: readonly AnalyzedDamlTypeDefinition[],
    ): readonly GeneratedNamedTypeFile[] {
        const modules = this.resolveModulesOrThrow(definitions);

        const names = this.resolveDefinitionNamesOrThrow(definitions);

        return [...modules.values()].map((module) => {
            const moduleDefinitions = definitions.filter((definition) =>
                definition.identity.packageId === module.packageId
                && definition.identity.moduleName === module.moduleName);

            const imports = this.emitReferencedTypeImports(
                module,
                moduleDefinitions,
                modules,
                names,
            );

            return new GeneratedNamedTypeFile({
                path: module.path,
                contents: [
                    ...imports,
                    ...(imports.length === 0 ? [] : [""]),
                    ...moduleDefinitions.map((definition) =>
                        this.emitDefinition(definition, names)),
                    "",
                ].join("\n"),
                packageId: module.packageId,
                moduleName: module.moduleName,
                namespaceAlias: module.namespaceAlias,
                exportedTypeNames: moduleDefinitions.map((definition) =>
                    this.getDefinitionName(definition, names)),
            });
        });
    }

    private emitDefinition(
        definition: AnalyzedDamlTypeDefinition,
        names: ReadonlyMap<string, string>,
    ): string {
        const name = this.getDefinitionName(definition, names);

        if (definition.kind === "record") {
            return [
                `export interface ${name} {`,
                ...definition.fields.map((field) =>
                    `    readonly ${field.propertyName}: ${this.getTypeName(field.type, names)};`),
                "}",
            ].join("\n");
        } else if (definition.kind === "variant") {
            return [
                `export type ${name} =`,
                ...definition.constructors.map((constructor) =>
                    `    | { readonly tag: ${JSON.stringify(constructor.constructor)}; readonly value: ${this.getTypeName(constructor.payload, names)}; }`),
            ].map((line, index, lines) => index === lines.length - 1 ? `${line};` : line).join("\n");
        }

        return `export type ${name} = ${definition.constructors.map((constructor) => JSON.stringify(constructor)).join(" | ")};`;
    }

    private emitReferencedTypeImports(
        module: ResolvedModule,
        definitions: readonly AnalyzedDamlTypeDefinition[],
        modules: ReadonlyMap<string, ResolvedModule>,
        names: ReadonlyMap<string, string>,
    ): readonly string[] {
        const imports = new Map<string, Set<string>>();

        for (const definition of definitions) {
            for (const reference of this.getNamedReferences(definition)) {
                const referencedModuleKey = this.getModuleKey(reference.identity.packageId, reference.identity.moduleName);

                if (referencedModuleKey === module.key) {
                    continue;
                }

                const referencedModule = modules.get(referencedModuleKey);

                if (referencedModule === undefined) {
                    throw new Error(`Cannot emit unresolved named DAML type '${reference.identity.name}'`);
                }

                const importPath = this.relativeModulePath(module.path, referencedModule.path);

                const importedNames = imports.get(importPath) ?? new Set<string>();

                importedNames.add(this.getNamedReferenceTypeName(reference.identity, names));
                imports.set(importPath, importedNames);
            }
        }

        return [...imports.entries()]
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([path, importedNames]) =>
                `import type { ${[...importedNames].sort().join(", ")} } from ${JSON.stringify(path)};`);
    }

    private *getNamedReferences(type: AnalyzedDamlType): Iterable<Extract<AnalyzedDamlType, { readonly kind: "namedReference" }>> {
        switch (type.kind) {
            case "namedReference":
                yield type;

                return;
            case "contractId":
                yield* this.getNamedReferences(type.contract);

                return;
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
                return;
        }
    }

    private getTypeName(type: AnalyzedDamlType, names: ReadonlyMap<string, string>): string {
        switch (type.kind) {
            case "primitive":
                return this.getPrimitiveTypeName(type.builtinType);
            case "contractId":
                return "string";
            case "optional":
                return `${this.getTypeName(type.element, names)} | undefined`;
            case "list":
                return `readonly ${this.getTypeName(type.element, names)}[]`;
            case "textMap":
                return `ReadonlyMap<string, ${this.getTypeName(type.value, names)}>`;
            case "genMap":
                return `ReadonlyMap<${this.getTypeName(type.key, names)}, ${this.getTypeName(type.value, names)}>`;
            case "record":
            case "variant":
            case "enum":
                throw new Error("Named DAML declarations must not contain anonymous record, variant, or enum shapes");
            case "namedReference":
                return this.getNamedReferenceTypeName(type.identity, names);
        }
    }

    private getPrimitiveTypeName(type: DamlLfBuiltinType): string {
        switch (type) {
            case DamlLfBuiltinType.unit:
                return "undefined";
            case DamlLfBuiltinType.bool:
                return "boolean";
            case DamlLfBuiltinType.int64:
                return "bigint";
            case DamlLfBuiltinType.date:
            case DamlLfBuiltinType.timestamp:
            case DamlLfBuiltinType.numeric:
            case DamlLfBuiltinType.party:
            case DamlLfBuiltinType.text:
                return "string";
            default:
                throw new Error(`Cannot emit unsupported primitive DAML type '${type}'`);
        }
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

        const packageDirectories = this.resolveCollisionSafeNames(
            [...new Set([...identities.values()].map((identity) => identity.packageId))],
            (packageId) => this.toKebabCase(packageId),
            () => "packages",
        );

        const moduleIdentities = [...identities.values()];

        const moduleDirectories = this.resolveCollisionSafeNames(
            moduleIdentities,
            (identity) => this.getModuleDirectory(identity),
            (identity) => identity.packageId,
        );

        const aliases = this.resolveCollisionSafeNames(
            moduleIdentities,
            (identity) => this.toPascalCase(`${identity.packageId} ${identity.moduleName}`),
            () => "",
        );

        return new Map([...identities.entries()].map(([key, identity]) => [
            key,
            {
                ...identity,
                key,
                path: `generated/packages/${packageDirectories.get(identity.packageId)!}/${moduleDirectories.get(identity)!}/types.ts`,
                namespaceAlias: aliases.get(identity)!,
            },
        ]));
    }

    private resolveDefinitionNamesOrThrow(
        definitions: readonly AnalyzedDamlTypeDefinition[],
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
            ([, definition]) => this.toPascalCase(definition.identity.name),
            ([, definition]) => this.getModuleKey(definition.identity.packageId, definition.identity.moduleName),
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

            const suffix = counts.get(groupKey) === 1 ? "" : `-${this.shortHash(JSON.stringify(value))}`;

            const baseCandidate = `${baseName}${suffix}`;

            const used = allocated.get(scope) ?? new Set<string>();

            let candidate = baseCandidate;

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

    private relativeModulePath(fromPath: string, toPath: string): string {
        const from = fromPath.split("/").slice(0, -1);

        const to = toPath.split("/").slice(0, -1);

        while (from[0] === to[0] && from.length > 0) {
            from.shift();
            to.shift();
        }

        return `${from.map(() => "..").concat(to).join("/") || "."}/types.js`.replace(/\/types\.js\/types\.js$/, "/types.js");
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

    private getModuleDirectory(identity: ModuleIdentity): string {
        return identity.moduleName.split(".").map((segment) => this.toKebabCase(segment)).join("/");
    }

    private toPascalCase(value: string): string {
        const normalized = value.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[^A-Za-z0-9]+/g, " ").trim();

        if (normalized.length === 0) {
            throw new Error("Cannot normalize an empty DAML identifier");
        }

        return normalized.split(/\s+/).map((segment) => `${segment[0].toUpperCase()}${segment.slice(1)}`).join("");
    }

    private toKebabCase(value: string): string {
        return this.toPascalCase(value).replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
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
