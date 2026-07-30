import { DamlInterfaceAnalysisResult } from "../analysis/daml-interface-analyzer.js";
import { AnalyzedDamlType } from "../analysis/analyzed-daml-type.js";
import { AnalyzedDamlTypeDefinition } from "../analysis/analyzed-daml-type-definition.js";
import { GeneratedDamlInterfaceProject } from "../emission-model/generated-daml-interface-project.js";
import { GeneratedNamedTypeFile } from "../emission-model/generated-named-type-file.js";
import { GeneratedSupportFile } from "../emission-model/generated-support-file.js";
import { GeneratedTemplateBindingFile } from "../emission-model/generated-template-binding-file.js";

export class SupportFileEmitter {
    /** Emits shared support files for the generated DAML interface project. */
    public emitSupportFiles(
        analysis: DamlInterfaceAnalysisResult,
        namedTypeFiles: readonly GeneratedNamedTypeFile[] = [],
    ): readonly GeneratedSupportFile[] {
        return [
            new GeneratedSupportFile({
                path: "generated/support/contracts.ts",
                contents: "export type GeneratedContractId = string;\n",
            }),
            new GeneratedSupportFile({
                path: "generated/support/runtime.ts",
                contents: [
                    'export type { DamlDate, DamlNumeric, DamlParty, DamlTimestamp, DamlUnit } from "@distrohelena/canton-typescript-sdk/daml-interface";',
                    "",
                ].join("\n"),
            }),
            this.emitDescriptorRegistry(analysis, namedTypeFiles),
        ];
    }

    /** Emits one barrel module for each generated DAML package/module namespace. */
    public emitNamespaceFiles(
        project: GeneratedDamlInterfaceProject,
    ): readonly GeneratedSupportFile[] {
        return this.getNamespaceGroups(project).map((group) =>
            new GeneratedSupportFile({
                path: `${group.directoryPath}/index.ts`,
                contents: `${[
                    ...(group.namedTypeFile === undefined ? [] : ["export * from \"./types.js\";"]),
                    ...group.templateFiles
                    .map((file) => this.getFileNameWithoutExtension(file.path))
                    .map((fileName) => `export * from "./${fileName}.js";`),
                ].join("\n")}\n`,
            })
        );
    }

    /** Emits the generated project index file. */
    public emitIndexFile(
        project: GeneratedDamlInterfaceProject,
    ): GeneratedSupportFile {
        const exportLines = this.getNamespaceGroups(project)
            .map((group) =>
                `export * as ${group.alias} from "${group.directoryPath
                    .replace(/^generated\//, "./")}/index.js";`);

        const lines = [
            ...exportLines,
            'export * from "./registry.js";',
        ];

        return new GeneratedSupportFile({
            path: "generated/index.ts",
            contents: `${lines.join("\n")}\n`,
        });
    }

    private getNamespaceGroups(
        project: GeneratedDamlInterfaceProject,
    ): readonly GeneratedNamespaceGroup[] {
        const groupsByDirectory = new Map<string, GeneratedNamespaceGroup>();

        const directoriesByAlias = new Map<string, string>();

        for (const templateFile of project.templateFiles) {
            const directoryPath = templateFile.path.replace(/\/[^/]+$/, "");

            const alias = templateFile.binding.namespaceAlias;

            const existingDirectory = directoriesByAlias.get(alias);

            if (existingDirectory !== undefined && existingDirectory !== directoryPath) {
                throw new Error(
                    `Cannot emit generated namespace '${alias}' for '${existingDirectory}' and '${directoryPath}'`,
                );
            }

            directoriesByAlias.set(alias, directoryPath);

            const group = groupsByDirectory.get(directoryPath);

            if (group === undefined) {
                groupsByDirectory.set(directoryPath, {
                    alias,
                    directoryPath,
                    templateFiles: [templateFile],
                });
            } else {
                group.templateFiles.push(templateFile);
            }
        }

        for (const namedTypeFile of project.namedTypeFiles) {
            const directoryPath = namedTypeFile.path.replace(/\/[^/]+$/, "");

            const group = groupsByDirectory.get(directoryPath);

            if (group === undefined) {
                groupsByDirectory.set(directoryPath, {
                    alias: namedTypeFile.namespaceAlias,
                    directoryPath,
                    templateFiles: [],
                    namedTypeFile,
                });
            } else if (group.alias !== namedTypeFile.namespaceAlias) {
                throw new Error(
                    `Cannot emit generated namespace '${group.alias}' and '${namedTypeFile.namespaceAlias}' for '${directoryPath}'`,
                );
            } else if (group.namedTypeFile !== undefined) {
                throw new Error(`Cannot emit duplicate named DAML type file for '${directoryPath}'`);
            } else {
                group.namedTypeFile = namedTypeFile;
            }
        }

        const groups = [...groupsByDirectory.values()];

        for (const group of groups) {
            this.assertDistinctModuleExportedSymbols(group);
        }

        return groups;
    }

    private getFileNameWithoutExtension(path: string): string {
        return path.slice(path.lastIndexOf("/") + 1).replace(/\.ts$/, "");
    }

    private assertDistinctModuleExportedSymbols(
        group: GeneratedNamespaceGroup,
    ): void {
        const descriptionsBySymbol = new Map<string, string>();

        for (const file of group.templateFiles) {
            for (const symbol of this.getExportedSymbols(file)) {
                const existing = descriptionsBySymbol.get(symbol);

                if (existing !== undefined) {
                    throw new Error(
                        `Cannot emit generated module symbol '${symbol}' for `
                        + `'${existing}' and '${this.describeTemplate(file)}'`,
                    );
                }

                descriptionsBySymbol.set(symbol, this.describeTemplate(file));
            }
        }

        if (group.namedTypeFile !== undefined) {
            for (const symbol of group.namedTypeFile.exportedTypeNames) {
                const existing = descriptionsBySymbol.get(symbol);

                if (existing !== undefined) {
                    throw new Error(
                        `Cannot emit generated module symbol '${symbol}' for `
                        + `'${existing}' and '${group.namedTypeFile.path}'`,
                    );
                }

                descriptionsBySymbol.set(symbol, group.namedTypeFile.path);
            }
        }
    }

    private getExportedSymbols(
        file: GeneratedTemplateBindingFile,
    ): readonly string[] {
        return [
            file.binding.className,
            file.binding.createFieldsTypeName,
            file.binding.createdEventTypeName,
            ...file.binding.choices.flatMap((choice) => [
                choice.choiceTypeName,
                choice.exercisedEventTypeName,
            ]),
        ];
    }

    private describeTemplate(file: GeneratedTemplateBindingFile): string {
        return file.binding.templateIdentityKey.replaceAll("\u0000", ":");
    }

    private emitDescriptorRegistry(
        analysis: DamlInterfaceAnalysisResult,
        namedTypeFiles: readonly GeneratedNamedTypeFile[],
    ): GeneratedSupportFile {
        const identities = new Set<string>();

        const fieldPropertyNames = new Map<string, string>();

        for (const file of namedTypeFiles) {
            for (const [key, propertyName] of file.fieldPropertyNames) {
                fieldPropertyNames.set(key, propertyName);
            }
        }

        const factories = analysis.typeDefinitions.map((definition) => {
            const identityKey = this.getIdentityKey(definition.identity.packageId, definition.identity.moduleName, definition.identity.name);

            if (identities.has(identityKey)) {
                throw new Error(`Cannot emit duplicate named DAML type descriptor '${identityKey}'`);
            }

            identities.add(identityKey);

            return `    ${JSON.stringify(identityKey)}: (typeArguments) => {\n${this.emitFactoryBody(definition, fieldPropertyNames)}\n    },`;
        });

        return new GeneratedSupportFile({
            path: "generated/support/descriptors.ts",
            contents: [
                'import type { DamlTypeDescriptor, DamlTypeDescriptorRegistry } from "@distrohelena/canton-typescript-sdk/daml-interface";',
                "",
                "function deepFreeze<T>(value: T): T {",
                "    if (value !== null && typeof value === \"object\") {",
                "        for (const child of Object.values(value)) {",
                "            deepFreeze(child);",
                "        }",
                "",
                "        Object.freeze(value);",
                "    }",
                "",
                "    return value;",
                "}",
                "",
                "const generatedDamlTypeDescriptorFactories: Readonly<Record<string, (typeArguments: readonly DamlTypeDescriptor[]) => DamlTypeDescriptor>> = Object.freeze({",
                ...factories,
                "});",
                "",
                "export class GeneratedDamlTypeDescriptorRegistry {",
                "    private constructor() {}",
                "",
                "    public static resolve(identity: Parameters<DamlTypeDescriptorRegistry[\"resolve\"]>[0], typeArguments: Parameters<DamlTypeDescriptorRegistry[\"resolve\"]>[1]): ReturnType<DamlTypeDescriptorRegistry[\"resolve\"]> {",
                "        const factory = generatedDamlTypeDescriptorFactories[`${identity.packageId}:${identity.moduleName}:${identity.entityName}`];",
                "",
                "        return factory === undefined ? undefined : factory(typeArguments);",
                "    }",
                "}",
                "",
            ].join("\n"),
        });
    }

    private emitFactoryBody(
        definition: AnalyzedDamlTypeDefinition,
        fieldPropertyNames: ReadonlyMap<string, string>,
    ): string {
        const typeParameters = definition.kind === "enum" ? [] : definition.typeParameters ?? [];

        const substitutions = new Map(
            typeParameters.map((parameter, index) => [
                parameter.internedStringIndex,
                `typeArguments[${index}]!`,
            ]),
        );

        return [
            `        if (typeArguments.length !== ${typeParameters.length}) {`,
            `            throw new Error(${JSON.stringify(`Expected ${typeParameters.length} type arguments for ${definition.identity.packageId}:${definition.identity.moduleName}:${definition.identity.name}`)});`,
            "        }",
            "",
            `        return deepFreeze(${this.emitDefinitionDescriptor(definition, fieldPropertyNames, substitutions)} satisfies DamlTypeDescriptor);`,
        ].join("\n");
    }

    private emitDescriptor(
        type: AnalyzedDamlType,
        substitutions: ReadonlyMap<number, string> = new Map(),
    ): string {
        switch (type.kind) {
            case "primitive":
                return `{ kind: "primitive", primitive: ${JSON.stringify(type.builtinType)}${type.numericScale === undefined ? "" : `, numericScale: ${type.numericScale}`} }`;
            case "contractId":
                return '{ kind: "contractId" }';
            case "optional":
                return `{ kind: "optional", element: ${this.emitDescriptor(type.element, substitutions)} }`;
            case "list":
                return `{ kind: "list", element: ${this.emitDescriptor(type.element, substitutions)} }`;
            case "textMap":
                return `{ kind: "textMap", value: ${this.emitDescriptor(type.value, substitutions)} }`;
            case "genMap":
                return `{ kind: "genMap", key: ${this.emitDescriptor(type.key, substitutions)}, value: ${this.emitDescriptor(type.value, substitutions)} }`;
            case "record":
                return `{ kind: "record", fields: [${type.fields.map((field) => `{ damlLabel: ${JSON.stringify(field.damlLabel)}, propertyName: ${JSON.stringify(field.propertyName)}, type: ${this.emitDescriptor(field.type, substitutions)} }`).join(", ")}] }`;
            case "variant":
                return `{ kind: "variant", constructors: [${type.constructors.map((constructor) => `{ constructor: ${JSON.stringify(constructor.constructor)}, payload: ${this.emitDescriptor(constructor.payload, substitutions)} }`).join(", ")}] }`;
            case "enum":
                return `{ kind: "enum", constructors: [${type.constructors.map((constructor) => JSON.stringify(constructor)).join(", ")}] }`;
            case "typeVariable":
                return this.getTypeVariableSubstitution(type, substitutions);
            case "namedReference":
                return `{ kind: "namedReference", identity: { packageId: ${JSON.stringify(type.identity.packageId)}, moduleName: ${JSON.stringify(type.identity.moduleName)}, entityName: ${JSON.stringify(type.identity.name)} }, typeArguments: [${(type.typeArguments ?? []).map((argument) => this.emitDescriptor(argument, substitutions)).join(", ")}] }`;
        }
    }

    private emitDefinitionDescriptor(
        definition: AnalyzedDamlTypeDefinition,
        fieldPropertyNames: ReadonlyMap<string, string>,
        substitutions: ReadonlyMap<number, string>,
    ): string {
        if (definition.kind !== "record") {
            return this.emitDescriptor(definition, substitutions);
        }

        return `{ kind: "record", fields: [${definition.fields.map((field, index) =>
            `{ damlLabel: ${JSON.stringify(field.damlLabel)}, propertyName: ${JSON.stringify(this.getFieldPropertyName(definition, index, fieldPropertyNames))}, type: ${this.emitDescriptor(field.type, substitutions)} }`).join(", ")}] }`;
    }

    private getTypeVariableSubstitution(
        type: Extract<AnalyzedDamlType, { readonly kind: "typeVariable" }>,
        substitutions: ReadonlyMap<number, string>,
    ): string {
        const substitution = substitutions.get(type.internedStringIndex);

        if (substitution === undefined) {
            throw new Error(`Cannot emit unbound generic DAML type variable '${type.name ?? `#${type.internedStringIndex}`}'`);
        }

        return substitution;
    }

    private getFieldPropertyName(
        definition: AnalyzedDamlTypeDefinition,
        index: number,
        names: ReadonlyMap<string, string>,
    ): string {
        const name = names.get(this.getFieldKey(definition, index));

        if (name !== undefined) {
            return name;
        } else if (definition.kind !== "record") {
            throw new Error(`Cannot resolve fields for non-record named DAML type '${definition.identity.name}'`);
        }

        return definition.fields[index].propertyName;
    }

    private getFieldKey(definition: AnalyzedDamlTypeDefinition, index: number): string {
        return `${definition.identity.packageId}\u0000${definition.identity.moduleName}\u0000${definition.identity.name}\u0000field\u0000${index}`;
    }

    private getIdentityKey(packageId: string, moduleName: string, entityName: string): string {
        return `${packageId}:${moduleName}:${entityName}`;
    }
}

interface GeneratedNamespaceGroup {
    readonly alias: string;
    readonly directoryPath: string;
    readonly templateFiles: GeneratedTemplateBindingFile[];
    namedTypeFile?: GeneratedNamedTypeFile;
}
