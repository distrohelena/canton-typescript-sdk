import { GeneratedDamlInterfaceProject } from "../emission-model/generated-daml-interface-project.js";
import { GeneratedSupportFile } from "../emission-model/generated-support-file.js";

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

    /** Emits the generated project index file. */
    public emitIndexFile(
        project: GeneratedDamlInterfaceProject,
    ): GeneratedSupportFile {
        const exportLines = project.templateFiles
            .map((file) => file.path.replace(/^generated\//, "./").replace(/\.ts$/, ".js"))
            .map((path) => `export * from "${path}";`);

        const lines = [
            ...exportLines,
            'export * from "./registry.js";',
        ];

        return new GeneratedSupportFile({
            path: "generated/index.ts",
            contents: `${lines.join("\n")}\n`,
        });
    }
}
