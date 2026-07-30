import { GeneratedDamlInterfaceProject } from "../emission-model/generated-daml-interface-project.js";
import { GeneratedRegistryFile } from "../emission-model/generated-registry-file.js";
import { type DamlModuleImportStyle } from "./daml-module-import-style.js";
import { RelativeModuleSpecifier } from "./relative-module-specifier.js";

export class RegistryEmitter {
    /** Emits a registry that dispatches created and exercised events by template id. */
    public emitRegistry(
        project: GeneratedDamlInterfaceProject,
        moduleImportStyle?: DamlModuleImportStyle,
    ): GeneratedRegistryFile {
        const importLines = project.templateFiles.map((file) => {
            const modulePath = RelativeModuleSpecifier.fromPaths(
                "generated/registry.ts",
                file.path,
                moduleImportStyle,
            );

            return `import { ${file.binding.className} } from "${modulePath}";`;
        });

        const createdCases = this.emitCases(project, "fromCreatedEvent");

        const exercisedCases = this.emitCases(project, "fromExercisedEvent");

        return new GeneratedRegistryFile({
            path: "generated/registry.ts",
            contents: [
                'import { DamlEventSourceNormalizer, DamlMaterializationError } from "@distrohelena/canton-typescript-sdk/daml-interface";',
                'import type { DamlCreatedEventSource, DamlExercisedEventSource } from "@distrohelena/canton-typescript-sdk/daml-interface";',
                ...importLines,
                "",
                "export class GeneratedRegistry {",
                "    public static fromCreatedEvent(event: DamlCreatedEventSource): unknown {",
                "        const normalized = DamlEventSourceNormalizer.normalizeCreated(event);",
                "        switch (`${normalized.metadata.templateId.packageId}:${normalized.metadata.templateId.moduleName}:${normalized.metadata.templateId.entityName}`) {",
                ...createdCases,
                "            default:",
                "                throw new DamlMaterializationError(\"template ID\", \"no generated template binding matches the created event\");",
                "        }",
                "    }",
                "",
                "    public static fromExercisedEvent(event: DamlExercisedEventSource): unknown {",
                "        const normalized = DamlEventSourceNormalizer.normalizeExercised(event);",
                "        switch (`${normalized.metadata.templateId.packageId}:${normalized.metadata.templateId.moduleName}:${normalized.metadata.templateId.entityName}`) {",
                ...exercisedCases,
                "            default:",
                "                throw new DamlMaterializationError(\"template ID\", \"no generated template binding matches the exercised event\");",
                "        }",
                "    }",
                "}",
                "",
            ].join("\n"),
        });
    }

    private emitCases(
        project: GeneratedDamlInterfaceProject,
        methodName: "fromCreatedEvent" | "fromExercisedEvent",
    ): readonly string[] {
        return project.templateFiles.map(
            (file) =>
                `            case "${file.binding.templateIdLiteral}":\n                return ${file.binding.className}.${methodName}(event);`,
        );
    }
}
