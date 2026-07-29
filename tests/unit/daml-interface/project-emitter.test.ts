import { describe, expect, it } from "vitest";
import { DamlLfBuiltinType } from "../../../src/daml-lf/model/daml-lf-builtin-type.js";
import { TypeConReference } from "../../../src/daml-lf/model/type-con-reference.js";
import { DamlInterfaceAnalysisResult } from "../../../src/daml-interface/analysis/daml-interface-analyzer.js";
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
        expect(descriptors?.contents).toContain('case "sample-hash\\u0000Main\\u0000Node":');
        expect(descriptors?.contents).toContain("return () => ({");
        expect(descriptors?.contents).toContain('kind: "namedReference"');
        expect((descriptors?.contents.match(/case "sample-hash\\u0000Main\\u0000Node":/g) ?? [])).toHaveLength(1);
    });
});
