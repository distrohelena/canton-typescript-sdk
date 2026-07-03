import { GeneratedDamlInterfaceProject } from "../emission-model/generated-daml-interface-project.js";
import { GeneratedRegistryFile } from "../emission-model/generated-registry-file.js";

export class RegistryEmitter {
    /** Emits a registry that dispatches created and exercised events by template id. */
    public emitRegistry(
        project: GeneratedDamlInterfaceProject,
    ): GeneratedRegistryFile {
        const importLines = project.templateFiles.map((file) => {
            const modulePath = file.path
                .replace(/^generated\//, "./")
                .replace(/\.ts$/, ".js");

            return `import { ${file.binding.className} } from "${modulePath}";`;
        });

        const createdCases = project.templateFiles.map(
            (file) =>
                `            case "${file.binding.templateIdLiteral}":\n                return ${file.binding.className}.decodeCreatedEvent(event);`,
        );

        const exercisedCases = project.templateFiles.map(
            (file) =>
                `            case "${file.binding.templateIdLiteral}":\n                return ${file.binding.className}.decodeExercisedEvent(event);`,
        );

        return new GeneratedRegistryFile({
            path: "generated/registry.ts",
            contents: [
                ...importLines,
                "",
                "export class GeneratedRegistry {",
                "    public static decodeCreatedEvent(templateId: string, event: unknown): unknown {",
                "        switch (templateId) {",
                ...createdCases,
                "            default:",
                "                return event;",
                "        }",
                "    }",
                "",
                "    public static decodeExercisedEvent(templateId: string, event: unknown): unknown {",
                "        switch (templateId) {",
                ...exercisedCases,
                "            default:",
                "                return event;",
                "        }",
                "    }",
                "}",
                "",
            ].join("\n"),
        });
    }
}
