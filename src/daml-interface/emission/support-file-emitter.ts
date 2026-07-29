import { GeneratedDamlInterfaceProject } from "../emission-model/generated-daml-interface-project.js";
import { GeneratedSupportFile } from "../emission-model/generated-support-file.js";
import { GeneratedTemplateBindingFile } from "../emission-model/generated-template-binding-file.js";

export class SupportFileEmitter {
    /** Emits shared support files for the generated DAML interface project. */
    public emitSupportFiles(): readonly GeneratedSupportFile[] {
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
        ];
    }

    /** Emits one barrel module for each generated DAML package/module namespace. */
    public emitNamespaceFiles(
        project: GeneratedDamlInterfaceProject,
    ): readonly GeneratedSupportFile[] {
        return this.getNamespaceGroups(project).map((group) =>
            new GeneratedSupportFile({
                path: `${group.directoryPath}/index.ts`,
                contents: `${group.templateFiles
                    .map((file) => this.getFileNameWithoutExtension(file.path))
                    .map((fileName) => `export * from "./${fileName}.js";`)
                    .join("\n")}\n`,
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
        const filesBySymbol = new Map<string, GeneratedTemplateBindingFile>();

        for (const file of group.templateFiles) {
            for (const symbol of this.getExportedSymbols(file)) {
                const existing = filesBySymbol.get(symbol);

                if (existing !== undefined && existing !== file) {
                    throw new Error(
                        `Cannot emit generated module symbol '${symbol}' for `
                        + `'${this.describeTemplate(existing)}' and '${this.describeTemplate(file)}'`,
                    );
                }

                filesBySymbol.set(symbol, file);
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
}

interface GeneratedNamespaceGroup {
    readonly alias: string;
    readonly directoryPath: string;
    readonly templateFiles: GeneratedTemplateBindingFile[];
}
