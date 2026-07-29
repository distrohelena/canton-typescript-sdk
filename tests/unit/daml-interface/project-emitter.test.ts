import { describe, expect, it } from "vitest";
import { DamlLfBuiltinType } from "../../../src/daml-lf/model/daml-lf-builtin-type.js";
import { DamlLfTemplateId } from "../../../src/daml-lf/model/daml-lf-template-id.js";
import { TypeConReference } from "../../../src/daml-lf/model/type-con-reference.js";
import { DamlInterfaceAnalysisResult } from "../../../src/daml-interface/analysis/daml-interface-analyzer.js";
import { AnalyzedTemplate } from "../../../src/daml-interface/analysis/analyzed-template.js";
import { ProjectEmitter } from "../../../src/daml-interface/emission/project-emitter.js";

describe("ProjectEmitter", () => {
    it("emits named declarations and one lazy descriptor registry for every reachable identity", () => {
        const identity = new TypeConReference({
            packageId: "sample-hash",
            moduleName: "Main",
            name: "Node",
        });

        const project = new ProjectEmitter().emitProject(new DamlInterfaceAnalysisResult({
            templates: [],
            typeDefinitions: [{
                identity,
                kind: "record",
                fields: [{
                    damlLabel: "next",
                    propertyName: "next",
                    type: { kind: "optional", element: { kind: "namedReference", identity } },
                }, {
                    damlLabel: "label",
                    propertyName: "label",
                    type: { kind: "primitive", builtinType: DamlLfBuiltinType.text },
                }],
            }],
        }));

        expect(project.namedTypeFiles.map((file) => file.path)).toEqual([
            "generated/packages/sample-hash/main/types.ts",
        ]);

        const descriptors = project.supportFiles.find((file) => file.path === "generated/support/descriptors.ts");

        expect(descriptors?.contents).toContain("export const generatedDamlTypeDescriptorRegistry");
        expect(descriptors?.contents).toContain('"sample-hash:Main:Node"');
        expect(descriptors?.contents).toContain("const generatedDamlTypeDescriptorFactories: Readonly<Record<string, () => DamlTypeDescriptor>> = Object.freeze({");
        expect(descriptors?.contents).toContain("Object.freeze({");
        expect(descriptors?.contents).toContain("() => Object.freeze({");
        expect(descriptors?.contents).toContain("`${identity.packageId}:${identity.moduleName}:${identity.entityName}`");
        expect(descriptors?.contents).toContain('kind: "namedReference"');
        expect(descriptors?.contents).not.toContain("\\u0000");
        expect((descriptors?.contents.match(/"sample-hash:Main:Node"/g) ?? [])).toHaveLength(1);
    });

    it("uses the template resolver package and module mapping for named declaration files", () => {
        const template = new AnalyzedTemplate({
            templateId: new DamlLfTemplateId({
                packageId: "package-one",
                moduleName: "Main",
                templateName: "Iou",
            }),
            className: "Iou",
            fileName: "iou.ts",
            createFields: [],
            choices: [],
        });

        const node = new TypeConReference({
            packageId: "package-one",
            moduleName: "Main",
            name: "Node",
        });

        const project = new ProjectEmitter().emitProject(new DamlInterfaceAnalysisResult({
            templates: [template],
            typeDefinitions: [{ identity: node, kind: "record", fields: [] }, {
                identity: new TypeConReference({
                    packageId: "package_one",
                    moduleName: "Main",
                    name: "Other",
                }),
                kind: "record",
                fields: [],
            }],
        }));

        const templateDirectory = project.templateFiles[0].path.replace(/\/[^/]+$/, "");

        const nodeTypes = project.namedTypeFiles.find((file) => file.path.endsWith("/main/types.ts"));

        expect(nodeTypes?.path.replace(/\/types\.ts$/, "")).toBe(templateDirectory);
    });

    it("reserves types.ts for named declarations when a template is named Types", () => {
        const template = new AnalyzedTemplate({
            templateId: new DamlLfTemplateId({
                packageId: "sample-hash",
                moduleName: "Main",
                templateName: "Types",
            }),
            className: "Types",
            fileName: "types.ts",
            createFields: [],
            choices: [],
        });

        const project = new ProjectEmitter().emitProject(new DamlInterfaceAnalysisResult({
            templates: [template],
            typeDefinitions: [{
                identity: new TypeConReference({
                    packageId: "sample-hash",
                    moduleName: "Main",
                    name: "Node",
                }),
                kind: "record",
                fields: [],
            }],
        }));

        expect(project.templateFiles[0].path).toBe("generated/packages/sample-hash/main/types-template.ts");
        expect(project.namedTypeFiles[0].path).toBe("generated/packages/sample-hash/main/types.ts");
        expect(project.supportFiles.find((file) => file.path === "generated/support/runtime.ts")?.contents)
            .toContain("DamlUnit");
    });
});
