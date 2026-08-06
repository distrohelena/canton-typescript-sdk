import { describe, expect, it } from "vitest";
import { GeneratedDamlInterfaceProject } from "../../../src/daml-interface/emission-model/generated-daml-interface-project.js";
import { GeneratedTemplateBinding } from "../../../src/daml-interface/emission-model/generated-template-binding.js";
import { GeneratedTemplateBindingFile } from "../../../src/daml-interface/emission-model/generated-template-binding-file.js";
import { RegistryEmitter } from "../../../src/daml-interface/emission/registry-emitter.js";

describe("RegistryEmitter", () => {
    it("emits a canonical registry that dispatches event sources by module and entity", () => {
        const templateFile = new GeneratedTemplateBindingFile({
            path: "generated/main/iou.ts",
            contents: "export class Iou {}",
            binding: new GeneratedTemplateBinding({
                className: "Iou",
                templateIdLiteral: "sample-hash:Main:Iou",
                path: "generated/main/iou.ts",
                createFieldsTypeName: "IouCreateFields",
                createdEventTypeName: "IouCreatedEvent",
                createFields: [],
                choices: [],
            }),
        });

        const project = new GeneratedDamlInterfaceProject({
            templateFiles: [templateFile],
        });

        const registryFile = new RegistryEmitter().emitRegistry(project);

        expect(registryFile.path).toBe("generated/registry.ts");
        expect(registryFile.contents).toContain("fromCreatedEvent(event: DamlCreatedEventSource)");
        expect(registryFile.contents).toContain("fromExercisedEvent(event: DamlExercisedEventSource)");
        expect(registryFile.contents).toContain("DamlEventSourceNormalizer.normalizeCreated(event)");
        expect(registryFile.contents).toContain("DamlEventSourceNormalizer.normalizeExercised(event)");
        expect(registryFile.contents).toContain("DamlMaterializationError");
        expect(registryFile.contents).toContain('case "Main:Iou"');
        expect(registryFile.contents).not.toContain("decodeCreatedEvent");
        expect(registryFile.contents).not.toContain("decodeExercisedEvent");
        expect(registryFile.contents).not.toContain("templateId: string");
        expect(registryFile.contents).not.toContain("return event;");
    });

    it("rejects same module/entity templates from different packages at emit time", () => {
        // Dispatch is upgrade-stable (module:entity), so distinct packages colliding on both names cannot
        // be told apart at runtime — the generator must fail loudly instead of emitting ambiguous cases.
        const project = new GeneratedDamlInterfaceProject({
            templateFiles: [
                createTemplateFile("package-one", "IouOne"),
                createTemplateFile("package-two", "IouTwo"),
            ],
        });

        expect(() => new RegistryEmitter().emitRegistry(project)).toThrow(/collide on module:entity/);
    });

    it("dispatches multiple versions of one template through a single upgrade-stable case", () => {
        // Two versions of the same package produce the same name-based literal; the registry emits one
        // case that any version's events route through.
        const project = new GeneratedDamlInterfaceProject({
            templateFiles: [createTemplateFile("app", "Iou")],
        });

        const contents = new RegistryEmitter().emitRegistry(project).contents;

        expect(contents).toContain('case "Main:Iou"');
        expect(contents).not.toContain("templateId.packageId");
    });
});

function createTemplateFile(
    packageId: string,
    className: string,
): GeneratedTemplateBindingFile {
    return new GeneratedTemplateBindingFile({
        path: `generated/packages/${packageId}/main/iou.ts`,
        contents: `export class ${className} {}`,
        binding: new GeneratedTemplateBinding({
            className,
            templateIdLiteral: `${packageId}:Main:Iou`,
            path: `generated/packages/${packageId}/main/iou.ts`,
            createFieldsTypeName: `${className}CreateFields`,
            createdEventTypeName: `${className}CreatedEvent`,
            createFields: [],
            choices: [],
        }),
    });
}
