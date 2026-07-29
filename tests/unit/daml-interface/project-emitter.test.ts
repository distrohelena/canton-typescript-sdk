import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DamlLfBuiltinType } from "../../../src/daml-lf/model/daml-lf-builtin-type.js";
import { DamlLfTemplateId } from "../../../src/daml-lf/model/daml-lf-template-id.js";
import { TypeConReference } from "../../../src/daml-lf/model/type-con-reference.js";
import { DamlInterfaceAnalysisResult } from "../../../src/daml-interface/analysis/daml-interface-analyzer.js";
import { AnalyzedTemplate } from "../../../src/daml-interface/analysis/analyzed-template.js";
import { AnalyzedChoice } from "../../../src/daml-interface/analysis/analyzed-choice.js";
import { ProjectEmitter } from "../../../src/daml-interface/emission/project-emitter.js";
import { DamlInterfaceWriter } from "../../../src/daml-interface/writing/daml-interface-writer.js";

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
        expect(descriptors?.contents).toContain("() => deepFreeze({");
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
            createFields: [{
                name: "issuer",
                propertyName: "issuer",
                type: {
                    kind: "record",
                    fields: [{ damlLabel: "status", propertyName: "status", type: {
                        kind: "variant",
                        constructors: [{ constructor: "Open", payload: { kind: "enum", constructors: ["Ready"] } }],
                    } }],
                },
            }],
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

    it("renames a named declaration that would collide with a compilable template barrel export", async () => {
        const template = new AnalyzedTemplate({
            templateId: new DamlLfTemplateId({
                packageId: "sample-hash",
                moduleName: "Main",
                templateName: "Node",
            }),
            className: "Node",
            fileName: "node.ts",
            createFields: [{
                name: "issuer",
                propertyName: "issuer",
                type: {
                    kind: "record",
                    fields: [{ damlLabel: "status", propertyName: "status", type: {
                        kind: "variant",
                        constructors: [{ constructor: "Open", payload: { kind: "enum", constructors: ["Ready"] } }],
                    } }],
                },
            }],
            choices: [new AnalyzedChoice({
                name: "Archive",
                methodName: "exerciseArchive",
                parameterName: "unit",
                parameterType: { kind: "primitive", builtinType: DamlLfBuiltinType.unit },
                returnType: { kind: "primitive", builtinType: DamlLfBuiltinType.unit },
            })],
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

        const namedTypes = project.namedTypeFiles[0];

        const barrel = project.supportFiles.find((file) =>
            file.path === "generated/packages/sample-hash/main/index.ts");

        expect(namedTypes.exportedTypeNames).toEqual(["NodeType"]);
        expect(namedTypes.contents).toContain("export interface NodeType {");
        expect(barrel?.contents).toBe([
            'export * from "./types.js";',
            'export * from "./node.js";',
            "",
        ].join("\n"));

        const outputDirectory = await mkdtemp(join(tmpdir(), "daml-interface-project-"));

        try {
            await new DamlInterfaceWriter().writeProjectAsync(project, outputDirectory);
            await writeGeneratedSdkTypeStub(outputDirectory);

            execFileSync(
                process.execPath,
                [
                    "./node_modules/typescript/bin/tsc",
                    "--noEmit",
                    "--module",
                    "NodeNext",
                    "--moduleResolution",
                    "NodeNext",
                    join(outputDirectory, "generated/packages/sample-hash/main/index.ts"),
                ],
                { cwd: process.cwd(), stdio: "inherit" },
            );
        } finally {
            await rm(outputDirectory, { recursive: true, force: true });
        }
    });

    it("imports named declarations by their resolved export name and a collision-safe alias", () => {
        const identity = new TypeConReference({
            packageId: "sample-hash",
            moduleName: "Main",
            name: "Node",
        });

        const template = new AnalyzedTemplate({
            templateId: new DamlLfTemplateId({
                packageId: "sample-hash",
                moduleName: "Main",
                templateName: "Node",
            }),
            className: "Node",
            fileName: "node.ts",
            createFields: [{
                name: "next",
                propertyName: "next",
                type: { kind: "namedReference", identity },
            }],
            choices: [],
        });

        const project = new ProjectEmitter().emitProject(new DamlInterfaceAnalysisResult({
            templates: [template],
            typeDefinitions: [{ identity, kind: "record", fields: [] }],
        }));

        const binding = project.templateFiles[0].contents;

        expect(binding).toContain('import type { NodeType as SampleHashMainNodeType } from "./types.js";');
        expect(binding).toContain("readonly next: SampleHashMainNodeType;");
        expect(binding).not.toContain("readonly next: Node;");
    });

    it("uses deterministic distinct record field aliases in declarations and descriptors", () => {
        const project = new ProjectEmitter().emitProject(new DamlInterfaceAnalysisResult({
            templates: [],
            typeDefinitions: [{
                identity: new TypeConReference({
                    packageId: "sample-hash",
                    moduleName: "Main",
                    name: "CollisionRecord",
                }),
                kind: "record",
                fields: [{
                    damlLabel: "first-value",
                    propertyName: "value",
                    type: { kind: "primitive", builtinType: DamlLfBuiltinType.text },
                }, {
                    damlLabel: "second-value",
                    propertyName: "value",
                    type: { kind: "primitive", builtinType: DamlLfBuiltinType.text },
                }],
            }],
        }));

        const declarations = project.namedTypeFiles[0].contents;

        const descriptors = project.supportFiles.find((file) => file.path === "generated/support/descriptors.ts")?.contents;

        const aliases = [...declarations.matchAll(/readonly (value(?:_[a-z0-9]+)?): string;/g)]
            .map((match) => match[1]);

        expect(new Set(aliases).size).toBe(2);

        for (const alias of aliases) {
            expect(descriptors).toContain(`propertyName: ${JSON.stringify(alias)}`);
        }
    });

    it("emits descriptor factories that type-check as DamlTypeDescriptor", async () => {
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
                }],
            }],
        }));

        const outputDirectory = await mkdtemp(join(tmpdir(), "daml-descriptors-"));

        try {
            await new DamlInterfaceWriter().writeProjectAsync(project, outputDirectory);
            await writeDescriptorRuntimeDeclaration(outputDirectory);

            execFileSync(
                process.execPath,
                [
                    "./node_modules/typescript/bin/tsc",
                    "--noEmit",
                    "--module",
                    "NodeNext",
                    "--moduleResolution",
                    "NodeNext",
                    join(outputDirectory, "generated/support/descriptors.ts"),
                ],
                { cwd: process.cwd(), stdio: "inherit" },
            );
        } finally {
            await rm(outputDirectory, { recursive: true, force: true });
        }
    });
});

async function writeDescriptorRuntimeDeclaration(outputDirectory: string): Promise<void> {
    const runtimeDirectory = join(
        outputDirectory,
        "node_modules/@distrohelena/canton-typescript-sdk",
    );

    await mkdir(runtimeDirectory, { recursive: true });
    await writeFile(join(runtimeDirectory, "package.json"), JSON.stringify({
        name: "@distrohelena/canton-typescript-sdk",
        type: "module",
        exports: { "./daml-interface": "./daml-interface.d.ts" },
    }), "utf8");
    await writeFile(join(runtimeDirectory, "daml-interface.d.ts"), [
        "export type DamlTypeIdentity = { readonly packageId: string; readonly moduleName: string; readonly entityName: string };",
        "export type DamlTypeDescriptor =",
        "    | { readonly kind: \"primitive\"; readonly primitive: string; readonly numericScale?: number }",
        "    | { readonly kind: \"optional\"; readonly element: DamlTypeDescriptor }",
        "    | { readonly kind: \"record\"; readonly fields: readonly { readonly damlLabel: string; readonly propertyName: string; readonly type: DamlTypeDescriptor }[] }",
        "    | { readonly kind: \"namedReference\"; readonly identity: DamlTypeIdentity };",
        "export type DamlTypeDescriptorRegistry = { readonly resolve: (identity: DamlTypeIdentity) => (() => DamlTypeDescriptor) | undefined };",
        "",
    ].join("\n"), "utf8");
}

async function writeGeneratedSdkTypeStub(outputDirectory: string): Promise<void> {
    const packageDirectory = join(outputDirectory, "node_modules", "@distrohelena", "canton-typescript-sdk");

    await mkdir(packageDirectory, { recursive: true });
    await writeFile(join(packageDirectory, "package.json"), JSON.stringify({
        name: "@distrohelena/canton-typescript-sdk",
        type: "module",
        exports: { "./daml-interface": "./daml-interface.d.ts" },
    }));
    await writeFile(join(packageDirectory, "daml-interface.d.ts"), [
        "export declare class DamlTemplate { constructor(contractId: string); }",
        "export declare class DamlMaterializationError extends Error { constructor(path: string, detail: string); }",
        "export declare class DamlUnit {}",
        "export type DamlDate = unknown;",
        "export type DamlNumeric = unknown;",
        "export type DamlParty = unknown;",
        "export type DamlTimestamp = unknown;",
        "export type DamlCreatedEventSource = unknown;",
        "export type DamlExercisedEventSource = unknown;",
        "export type DamlExercisedEventMetadata = unknown;",
        "export type DamlNormalizedExercisedEvent = any;",
        "export type DamlTypeDescriptor = unknown;",
        "export type DamlTypeIdentity = { readonly packageId: string; readonly moduleName: string; readonly entityName: string; };",
        "export type DamlTypeDescriptorRegistry = { readonly resolve: (identity: DamlTypeIdentity) => (() => DamlTypeDescriptor) | undefined; };",
        "export declare function decodeDamlValue(...args: readonly unknown[]): unknown;",
        "export declare function materializeDamlValue<T>(value: unknown): T;",
        "export declare function normalizeDamlCreatedEventSource(source: unknown): any;",
        "export declare function normalizeDamlExercisedEventSource(source: unknown): any;",
        "",
    ].join("\n"));
}
