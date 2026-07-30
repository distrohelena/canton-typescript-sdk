import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DamlLfBuiltinType } from "../../../src/daml-lf/model/daml-lf-builtin-type.js";
import { DamlLfTemplateId } from "../../../src/daml-lf/model/daml-lf-template-id.js";
import { TypeConReference } from "../../../src/daml-lf/model/type-con-reference.js";
import { DamlInterfaceAnalysisResult } from "../../../src/daml-interface/analysis/daml-interface-analyzer.js";
import { AnalyzedChoice } from "../../../src/daml-interface/analysis/analyzed-choice.js";
import { AnalyzedTemplate } from "../../../src/daml-interface/analysis/analyzed-template.js";
import { DamlInterfaceGenerator } from "../../../src/daml-interface/daml-interface-generator.js";
import { ProjectEmitter } from "../../../src/daml-interface/emission/project-emitter.js";
import { DamlInterfaceWriter } from "../../../src/daml-interface/writing/daml-interface-writer.js";
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

    it("typechecks a DamlNumeric template and its generated sibling spec", async () => {
        await typecheckGeneratedTemplateAndSpec(createTemplateProject("DamlNumeric"));
    });

    it("typechecks a template colliding with an SDK type import and its sibling spec", async () => {
        await typecheckGeneratedTemplateAndSpec(createTemplateProject("DamlCreatedEventSource"));
    });

    it("typechecks a template colliding with an SDK value import and its sibling spec", async () => {
        await typecheckGeneratedTemplateAndSpec(createTemplateProject("DamlEventSourceNormalizer"));
    });

    it("allocates distinct named-spec locals for colliding DAML variant labels", async () => {
        const project = new ProjectEmitter().emitProject(new DamlInterfaceAnalysisResult({
            templates: [],
            typeDefinitions: [{
                identity: new TypeConReference({ packageId: "sample-hash", moduleName: "Sample.Types", name: "Choice" }),
                kind: "variant",
                typeParameters: [],
                constructors: [{ constructor: "A-B", payload: { kind: "primitive", builtinType: DamlLfBuiltinType.text } }, {
                    constructor: "A_B", payload: { kind: "primitive", builtinType: DamlLfBuiltinType.text },
                }],
            }],
        }));

        const spec = project.specFiles.find((file) => file.productionPath.endsWith("/types.ts"));

        expect(spec?.contents).toContain("const Choice_A_B =");
        expect(spec?.contents).toContain("const Choice_A_B_2 =");
        await typecheckGeneratedSpec(project, spec?.path);
    });

    it("typechecks a known forwarded namespace-barrel value export", async () => {
        const project = createTemplateProject("Iou");

        const spec = project.specFiles.find((file) =>
            file.productionPath.endsWith("/sample/module/index.ts"));

        expect(spec?.contents).toContain('import { Iou } from "./index.js";');
        expect(spec?.contents).toContain('assert.equal(typeof Iou, "function");');
        await typecheckGeneratedSpec(project, spec?.path);
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

function createTemplateProject(className: string) {
    return new ProjectEmitter().emitProject(new DamlInterfaceAnalysisResult({
        templates: [new AnalyzedTemplate({
            templateId: new DamlLfTemplateId({
                packageId: "sample-hash",
                moduleName: "Sample.Module",
                templateName: className,
            }),
            className,
            fileName: `${className}.ts`,
            createFields: [{
                name: "amount",
                propertyName: "amount",
                type: { kind: "primitive", builtinType: DamlLfBuiltinType.numeric, numericScale: 2 },
            }],
            choices: [],
        })],
        typeDefinitions: [],
    }));
}

async function typecheckGeneratedTemplateAndSpec(project: ReturnType<typeof createTemplateProject>): Promise<void> {
    await typecheckGeneratedSpec(
        project,
        project.specFiles.find((file) => file.productionPath === project.templateFiles[0]?.path)?.path,
    );
}

async function typecheckGeneratedSpec(
    project: ReturnType<typeof createTemplateProject> | import("../../../src/daml-interface/emission-model/generated-daml-interface-project.js").GeneratedDamlInterfaceProject,
    specPath: string | undefined,
): Promise<void> {
    const directory = await mkdtemp(join(tmpdir(), "daml-template-import-collision-"));

    try {
        await new DamlInterfaceWriter().writeProjectAsync(project, directory);
        await writeGeneratedSdkAndNodeTypeStubs(directory);

        execFileSync(process.execPath, [
            "./node_modules/typescript/bin/tsc",
            "--noEmit",
            "--target", "ES2022",
            "--module", "NodeNext",
            "--moduleResolution", "NodeNext",
            "--skipLibCheck",
            join(directory, specPath ?? "missing.spec.ts"),
        ], { cwd: process.cwd(), stdio: "inherit" });
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
}

async function writeGeneratedSdkAndNodeTypeStubs(directory: string): Promise<void> {
    const sdkDirectory = join(directory, "node_modules", "@distrohelena", "canton-typescript-sdk");

    await mkdir(sdkDirectory, { recursive: true });
    await writeFile(join(sdkDirectory, "package.json"), JSON.stringify({
        name: "@distrohelena/canton-typescript-sdk",
        type: "module",
        exports: { "./daml-interface": "./daml-interface.d.ts" },
    }), "utf8");
    await writeFile(join(sdkDirectory, "daml-interface.d.ts"), [
        "export declare class DamlTemplate { constructor(contractId: string); public readonly contractId: string; }",
        "export declare class DamlMaterializationError extends Error { constructor(path: string, detail: string); }",
        "export declare class DamlDate { constructor(...args: readonly unknown[]); }",
        "export declare class DamlNumeric { constructor(...args: readonly unknown[]); }",
        "export declare class DamlParty { constructor(...args: readonly unknown[]); }",
        "export declare class DamlTimestamp { constructor(...args: readonly unknown[]); }",
        "export declare class DamlUnit {}",
        "export type DamlCreatedEventSource = unknown;",
        "export type DamlExercisedEventSource = unknown;",
        "export type DamlExercisedEventMetadata = unknown;",
        "export type DamlNormalizedExercisedEvent = any;",
        "export type DamlTypeIdentity = { readonly packageId: string; readonly moduleName: string; readonly entityName: string; };",
        "export type DamlTypeDescriptor = { readonly kind: string; readonly [key: string]: unknown; };",
        "export type DamlTypeDescriptorRegistry = { readonly resolve: (identity: DamlTypeIdentity, typeArguments: readonly DamlTypeDescriptor[]) => DamlTypeDescriptor | undefined; };",
        "export declare class DamlValueConverter { static decode(...args: readonly unknown[]): unknown; }",
        "export declare class DamlValueMaterializer { static materialize<T>(value: unknown): T; }",
        "export declare class DamlEventSourceNormalizer { static normalizeCreated(source: unknown): any; static normalizeExercised(source: unknown): any; }",
        "",
    ].join("\n"), "utf8");

    const nodeTypesDirectory = join(directory, "node_modules", "@types", "node");

    await mkdir(nodeTypesDirectory, { recursive: true });
    await writeFile(join(nodeTypesDirectory, "index.d.ts"), [
        'declare module "node:assert/strict" { const assert: { ok(value: unknown): void; equal(left: unknown, right: unknown): void; deepEqual(left: unknown, right: unknown): void; notEqual(left: unknown, right: unknown): void; }; export default assert; }',
        'declare module "node:test" { export function test(name: string, body: () => void): void; }',
        "",
    ].join("\n"), "utf8");
}
