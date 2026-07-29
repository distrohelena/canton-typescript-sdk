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
    it("rejects an exercised event for another template even when the choice name matches", async () => {
        const outputDirectory = await mkdtemp(join(tmpdir(), "daml-template-runtime-"));

        try {
            const emitter = new TemplateBindingEmitter();

            const one = emitter.emitTemplateFile(template("package-one"));

            const two = emitter.emitTemplateFile(template("package-two"));

            await writeRuntime(outputDirectory);
            await writeBinding(outputDirectory, one.path, one.contents);
            await writeBinding(outputDirectory, two.path, two.contents);

            const module = await import(pathToFileURL(join(outputDirectory, one.path.replace(/\.ts$/, ".js"))).href);

            let error: unknown;

            try {
                module.IouTransferExercisedEvent.fromExercisedEvent({
                    contractId: "#cid",
                    choice: "Transfer",
                    argument: { value: "owner" },
                    result: { value: "ok" },
                    consuming: false,
                    metadata: { templateId: { packageId: "package-two", moduleName: "Main", entityName: "Iou" } },
                });
            } catch (caught) {
                error = caught;
            }

            expect(error).toMatchObject({ path: "template ID" });
            expect((error as { readonly constructor: { readonly name: string } }).constructor.name).toBe("DamlMaterializationError");
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
    await writeFile(join(root, "generated", "support", "descriptors.js"), "export const generatedDamlTypeDescriptorRegistry = {};\n");
    await writeFile(join(sdkDirectory, "package.json"), '{"type":"module","exports":{"./daml-interface":"./daml-interface.js"}}');
    await writeFile(join(sdkDirectory, "daml-interface.js"), [
        "export class DamlMaterializationError extends Error { constructor(path, detail) { super(`${path}: ${detail}`); this.path = path; } }",
        "export class DamlTemplate { constructor(contractId) { this.contractId = contractId; } }",
        "export const normalizeDamlCreatedEventSource = (event) => event;",
        "export const normalizeDamlExercisedEventSource = (event) => event;",
        "export const decodeDamlValue = (source) => source.value;",
        "export const materializeDamlValue = (value) => value;",
        "",
    ].join("\n"));
}
