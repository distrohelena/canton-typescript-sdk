import { describe, expect, it } from "vitest";
import { DamlLfBuiltinType } from "../../../src/daml-lf/model/daml-lf-builtin-type.js";
import { DamlLfTemplateId } from "../../../src/daml-lf/model/daml-lf-template-id.js";
import { DamlInterfaceAnalysisResult } from "../../../src/daml-interface/analysis/daml-interface-analyzer.js";
import { AnalyzedChoice } from "../../../src/daml-interface/analysis/analyzed-choice.js";
import { AnalyzedTemplate } from "../../../src/daml-interface/analysis/analyzed-template.js";
import { ProjectEmitter } from "../../../src/daml-interface/emission/project-emitter.js";

describe("GeneratedSpecEmitter", () => {
    it("emits a runnable sibling spec for every generated production module", () => {
        const project = new ProjectEmitter().emitProject(new DamlInterfaceAnalysisResult({
            templates: [new AnalyzedTemplate({
                templateId: new DamlLfTemplateId({
                    packageId: "sample-hash",
                    moduleName: "Sample.Module",
                    templateName: "Iou",
                }),
                className: "Iou",
                fileName: "iou.ts",
                createFields: [{
                    name: "owner",
                    propertyName: "owner",
                    type: { kind: "primitive", builtinType: DamlLfBuiltinType.party },
                }],
                choices: [new AnalyzedChoice({
                    name: "Archive",
                    methodName: "exerciseArchive",
                    parameterName: "unit",
                    parameterType: { kind: "primitive", builtinType: DamlLfBuiltinType.unit },
                    returnType: { kind: "primitive", builtinType: DamlLfBuiltinType.unit },
                })],
            })],
            typeDefinitions: [],
        }));

        expect(project.specFiles).toHaveLength(project.productionFiles.length);
        expect(project.specFiles.map((file) => file.path)).toEqual(
            project.productionFiles.map((file) => file.path.replace(/\.ts$/, ".spec.ts")),
        );

        const templateSpec = project.specFiles.find((file) =>
            file.productionPath === project.templateFiles[0]?.path);

        expect(templateSpec?.contents).toContain('import { test } from "node:test";');
        expect(templateSpec?.contents).toContain('import assert from "node:assert/strict";');
        expect(templateSpec?.contents).toContain('from "./iou.js";');
        expect(templateSpec?.contents).toContain("Iou.fromCreatedEvent");
        expect(templateSpec?.contents).toContain("Iou.fromExercisedEvent");
        expect(templateSpec?.contents).toContain("IouArchiveExercisedEvent");
        expect(templateSpec?.contents).toContain("metadata");

        for (const spec of project.specFiles) {
            expect(spec.contents).toContain('import { test } from "node:test";');
            expect(spec.contents).toContain('import assert from "node:assert/strict";');
        }
    });
});
