import { describe, expect, it } from "vitest";
import { DamlLfBuiltinType } from "../../../src/daml-lf/model/daml-lf-builtin-type.js";
import { DamlLfTemplateId } from "../../../src/daml-lf/model/daml-lf-template-id.js";
import { DamlInterfaceAnalysisResult } from "../../../src/daml-interface/analysis/daml-interface-analyzer.js";
import { AnalyzedChoice } from "../../../src/daml-interface/analysis/analyzed-choice.js";
import { AnalyzedTemplate } from "../../../src/daml-interface/analysis/analyzed-template.js";
import { DamlInterfaceGenerator } from "../../../src/daml-interface/daml-interface-generator.js";
import { ProjectEmitter } from "../../../src/daml-interface/emission/project-emitter.js";
import { SampleLfPackageFixture } from "../../fixtures/daml-lf/sample-lf-package-fixture.js";

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

    it("aliases sample runtime wrappers away from a colliding generated template class", () => {
        const project = new ProjectEmitter().emitProject(new DamlInterfaceAnalysisResult({
            templates: [new AnalyzedTemplate({
                templateId: new DamlLfTemplateId({
                    packageId: "sample-hash",
                    moduleName: "Sample.Module",
                    templateName: "DamlNumeric",
                }),
                className: "DamlNumeric",
                fileName: "daml-numeric.ts",
                createFields: [{
                    name: "amount",
                    propertyName: "amount",
                    type: { kind: "primitive", builtinType: DamlLfBuiltinType.numeric, numericScale: 2 },
                }],
                choices: [],
            })],
            typeDefinitions: [],
        }));

        const spec = project.specFiles.find((file) => file.productionPath === project.templateFiles[0]?.path);

        expect(spec?.contents).toContain('import { DamlNumeric as GeneratedTypeDamlNumeric } from "@distrohelena/canton-typescript-sdk/daml-interface";');
        expect(spec?.contents).toContain('new GeneratedTypeDamlNumeric("1.00")');
    });

    it("emits finite generic-recursive named type specs from the generic fixture", async () => {
        const project = await new DamlInterfaceGenerator().generateFromDalfOrThrowAsync(
            SampleLfPackageFixture.createGenericRecursiveLf2ArchiveBytes(),
        );

        const namedSpec = project.specFiles.find((file) => file.productionPath.endsWith("/types.ts"));

        expect(namedSpec?.contents).toContain("satisfies Node<string>");
        expect(namedSpec?.contents).toContain("satisfies GenericVariant<string>");
        expect(namedSpec?.contents).toContain("next: undefined");
    });

    it("keeps opaque external ContractId samples string-shaped without importing the external package", async () => {
        const project = await new DamlInterfaceGenerator().generateFromDalfOrThrowAsync(
            SampleLfPackageFixture.createOpaqueContractIdLf2ArchiveBytes(),
        );

        const templateSpec = project.specFiles.find((file) => file.productionPath === project.templateFiles[0]?.path);

        expect(templateSpec?.contents).toContain('"#sample-contract-id"');
        expect(templateSpec?.contents).not.toContain("missing-package-id");
        expect(templateSpec?.contents).not.toContain("HoldingV1");
    });
});
