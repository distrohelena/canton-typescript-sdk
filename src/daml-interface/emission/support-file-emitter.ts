import { DamlInterfaceAnalysisResult } from "../analysis/daml-interface-analyzer.js";
import { AnalyzedDamlType } from "../analysis/analyzed-daml-type.js";
import { GeneratedDamlInterfaceProject } from "../emission-model/generated-daml-interface-project.js";
import { GeneratedNamedTypeFile } from "../emission-model/generated-named-type-file.js";
import { GeneratedSupportFile } from "../emission-model/generated-support-file.js";
import { GeneratedTemplateBindingFile } from "../emission-model/generated-template-binding-file.js";

export class SupportFileEmitter {
    /** Emits shared support files for the generated DAML interface project. */
    public emitSupportFiles(
        analysis: DamlInterfaceAnalysisResult,
    ): readonly GeneratedSupportFile[] {
        return [
            new GeneratedSupportFile({
                path: "generated/support/contracts.ts",
                contents: "export type GeneratedContractId = string;\n",
            }),
            new GeneratedSupportFile({
                path: "generated/support/decoding.ts",
                contents:
                    "export function castGeneratedEvent<T>(event: unknown): T {\n    return event as T;\n}\n",
            }),
            new GeneratedSupportFile({
                path: "generated/support/runtime.ts",
                contents: [
                    'export type { DamlDate, DamlNumeric, DamlParty, DamlTimestamp, DamlUnit } from "@distrohelena/canton-typescript-sdk/daml-interface";',
                    "",
                ].join("\n"),
            }),
            this.emitDescriptorRegistry(analysis),
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
    ): GeneratedSupportFile {
        const identities = new Set<string>();

        const factories = analysis.typeDefinitions.map((definition) => {
            const identityKey = this.getIdentityKey(definition.identity.packageId, definition.identity.moduleName, definition.identity.name);

            if (identities.has(identityKey)) {
                throw new Error(`Cannot emit duplicate named DAML type descriptor '${identityKey}'`);
            }

            identities.add(identityKey);

            return [
                `    ${JSON.stringify(identityKey)}: () => Object.freeze(${this.emitDescriptor(definition)}),`,
            ].join("");
        });

        return new GeneratedSupportFile({
            path: "generated/support/descriptors.ts",
            contents: [
                'import type { DamlTypeDescriptor, DamlTypeDescriptorRegistry } from "@distrohelena/canton-typescript-sdk/daml-interface";',
                "",
                "const generatedDamlTypeDescriptorFactories: Readonly<Record<string, () => DamlTypeDescriptor>> = Object.freeze({",
                ...factories,
                "});",
                "",
                "export const generatedDamlTypeDescriptorRegistry: DamlTypeDescriptorRegistry = Object.freeze({",
                "    resolve(identity) {",
                "        return generatedDamlTypeDescriptorFactories[`${identity.packageId}:${identity.moduleName}:${identity.entityName}`];",
                "    },",
                "};",
                "",
            ].join("\n"),
        });
    }

    private emitDescriptor(type: AnalyzedDamlType): string {
        switch (type.kind) {
            case "primitive":
                return `{ kind: "primitive", primitive: ${JSON.stringify(type.builtinType)}${type.numericScale === undefined ? "" : `, numericScale: ${type.numericScale}`} }`;
            case "contractId":
                return `{ kind: "contractId", contract: ${this.emitDescriptor(type.contract)} }`;
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
