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
                "        switch (`${normalized.metadata.templateId.moduleName}:${normalized.metadata.templateId.entityName}`) {",
                ...createdCases,
                "            default:",
                "                throw new DamlMaterializationError(\"template ID\", \"no generated template binding matches the created event\");",
                "        }",
                "    }",
                "",
                "    public static fromExercisedEvent(event: DamlExercisedEventSource): unknown {",
                "        const normalized = DamlEventSourceNormalizer.normalizeExercised(event);",
                "        switch (`${normalized.metadata.templateId.moduleName}:${normalized.metadata.templateId.entityName}`) {",
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
        // Dispatch is by module:entity — package ids are version-specific under smart contract upgrades,
        // so any version of a template routes to its binding; the binding's own identity guard then
        // verifies the package name when the event carries one.
        const seen = new Map<string, string>();

        return project.templateFiles.map((file) => {
            const parts = file.binding.templateIdLiteral.split(":");

            const dispatchKey = `${parts[1]}:${parts[2]}`;

            const existing = seen.get(dispatchKey);

            if (existing !== undefined && existing !== file.binding.templateIdLiteral) {
                throw new Error(
                    `Generated registry cannot dispatch '${dispatchKey}': templates '${existing}' and `
                        + `'${file.binding.templateIdLiteral}' collide on module:entity across packages.`,
                );
            }

            seen.set(dispatchKey, file.binding.templateIdLiteral);

            return `            case "${dispatchKey}":\n                return ${file.binding.className}.${methodName}(event);`;
        });
    }
}
