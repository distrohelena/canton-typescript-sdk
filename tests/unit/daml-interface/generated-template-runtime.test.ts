import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { transpileModule, ModuleKind, ScriptTarget } from "typescript";
import { describe, expect, it } from "vitest";
import { DamlLfBuiltinType } from "../../../src/daml-lf/model/daml-lf-builtin-type.js";
import { DamlLfTemplateId } from "../../../src/daml-lf/model/daml-lf-template-id.js";
import { DamlLfType } from "../../../src/daml-lf/model/daml-lf-type.js";
import { AnalyzedChoice } from "../../../src/daml-interface/analysis/analyzed-choice.js";
import { AnalyzedTemplate } from "../../../src/daml-interface/analysis/analyzed-template.js";
import { TemplateBindingEmitter } from "../../../src/daml-interface/emission/template-binding-emitter.js";

describe("generated template choice factories", () => {
    it("rejects cross-package-name and cross-entity events while accepting any package version", async () => {
        const outputDirectory = await mkdtemp(join(tmpdir(), "daml-template-runtime-"));

        try {
            const emitter = new TemplateBindingEmitter();

            emitter.providePackageMetadata(new Map([
                ["package-one", { packageName: "pkg-one" }],
                ["package-two", { packageName: "pkg-two" }],
            ]));

            const one = emitter.emitTemplateFile(template("package-one"));

            const two = emitter.emitTemplateFile(template("package-two"));

            await writeRuntime(outputDirectory);
            await writeBinding(outputDirectory, one.path, one.contents);
            await writeBinding(outputDirectory, two.path, two.contents);

            const module = await import(pathToFileURL(join(outputDirectory, one.path.replace(/\.ts$/, ".js"))).href);

            // A contract from ANOTHER PACKAGE NAME is rejected when the event names its package.
            let error: unknown;

            try {
                module.IouTransferExercisedEvent.fromExercisedEvent({
                    contractId: "#cid",
                    choice: "Transfer",
                    argument: { value: "owner" },
                    result: { value: "ok" },
                    consuming: false,
                    metadata: { templateId: { packageId: "package-two", moduleName: "Main", entityName: "Iou" }, packageName: "pkg-two" },
                });
            } catch (caught) {
                error = caught;
            }

            expect(error).toMatchObject({ path: "template ID" });
            expect((error as { readonly constructor: { readonly name: string } }).constructor.name).toBe("DamlMaterializationError");

            // A DIFFERENT VERSION of the same package name — a different package id — materializes fine:
            // smart contract upgrades make exact package-id matching wrong.
            const upgraded = module.IouTransferExercisedEvent.fromExercisedEvent({
                contractId: "#cid",
                choice: "Transfer",
                argument: { value: "owner" },
                result: { value: "ok" },
                consuming: false,
                metadata: { templateId: { packageId: "package-one-v15", moduleName: "Main", entityName: "Iou" }, packageName: "pkg-one" },
            });

            expect(upgraded.contractId).toBe("#cid");

            // A different module/entity is always rejected, with or without a package name.
            let entityError: unknown;

            try {
                module.IouTransferExercisedEvent.fromExercisedEvent({
                    contractId: "#cid",
                    choice: "Transfer",
                    argument: { value: "owner" },
                    result: { value: "ok" },
                    consuming: false,
                    metadata: { templateId: { packageId: "package-one", moduleName: "Other", entityName: "Iou" } },
                });
            } catch (caught) {
                entityError = caught;
            }

            expect(entityError).toMatchObject({ path: "template ID" });
        } finally {
            await rm(outputDirectory, { recursive: true, force: true });
        }
    });
});

function template(packageId: string): AnalyzedTemplate {
    return new AnalyzedTemplate({
        templateId: new DamlLfTemplateId({ packageId, moduleName: "Main", templateName: "Iou" }),
        className: "Iou",
        fileName: "iou.ts",
        createFields: [],
        choices: [new AnalyzedChoice({
            name: "Transfer",
            methodName: "exerciseTransfer",
            parameterName: "owner",
            parameterType: new DamlLfType({ builtinType: DamlLfBuiltinType.text }),
            returnType: new DamlLfType({ builtinType: DamlLfBuiltinType.text }),
        })],
    });
}

async function writeBinding(root: string, path: string, contents: string): Promise<void> {
    const outputPath = join(root, path.replace(/\.ts$/, ".js"));

    await mkdir(outputPath.replace(/\/[^/]+$/, ""), { recursive: true });
    await writeFile(outputPath, transpileModule(contents, {
        compilerOptions: { module: ModuleKind.ESNext, target: ScriptTarget.ES2022 },
    }).outputText);
}

async function writeRuntime(root: string): Promise<void> {
    const sdkDirectory = join(root, "node_modules", "@distrohelena", "canton-typescript-sdk");

    await mkdir(sdkDirectory, { recursive: true });
    await mkdir(join(root, "generated", "support"), { recursive: true });
    await writeFile(join(root, "package.json"), '{"type":"module"}');
    await writeFile(join(root, "generated", "support", "descriptors.js"), "export class GeneratedDamlTypeDescriptorRegistry { static resolve() { return undefined; } }\n");
    await writeFile(join(sdkDirectory, "package.json"), '{"type":"module","exports":{"./daml-interface":"./daml-interface.js"}}');
    await writeFile(join(sdkDirectory, "daml-interface.js"), [
        "export class DamlMaterializationError extends Error { constructor(path, detail) { super(`${path}: ${detail}`); this.path = path; } }",
        "export class DamlTemplate { constructor(contractId) { this.contractId = contractId; } }",
        "export class DamlEventSourceNormalizer { static normalizeCreated(event) { return event; } static normalizeExercised(event) { return event; } }",
        "export class DamlValueConverter { static decode(source) { return source.value; } }",
        "export class DamlValueMaterializer { static materialize(value) { return value; } }",
        "",
    ].join("\n"));
}
