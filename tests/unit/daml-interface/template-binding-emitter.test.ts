import { describe, expect, it } from "vitest";
import { DamlLfBuiltinType } from "../../../src/daml-lf/model/daml-lf-builtin-type.js";
import { DamlLfTemplateId } from "../../../src/daml-lf/model/daml-lf-template-id.js";
import { DamlLfType } from "../../../src/daml-lf/model/daml-lf-type.js";
import { AnalyzedChoice } from "../../../src/daml-interface/analysis/analyzed-choice.js";
import {
    AnalyzedTemplate,
    AnalyzedTemplateField,
} from "../../../src/daml-interface/analysis/analyzed-template.js";
import { TemplateBindingEmitter } from "../../../src/daml-interface/emission/template-binding-emitter.js";

describe("TemplateBindingEmitter", () => {
    it("emits typed template and choice event classes from analyzed template metadata", () => {
        const template = new AnalyzedTemplate({
            templateId: new DamlLfTemplateId({
                packageId: "sample-hash",
                moduleName: "Main",
                templateName: "Iou",
            }),
            className: "Iou",
            fileName: "iou.ts",
            createFields: [
                new AnalyzedTemplateField({
                    name: "issuer",
                    propertyName: "issuer",
                    type: new DamlLfType({
                        builtinType: DamlLfBuiltinType.text,
                    }),
                }),
                new AnalyzedTemplateField({
                    name: "owner",
                    propertyName: "owner",
                    type: new DamlLfType({
                        builtinType: DamlLfBuiltinType.text,
                    }),
                }),
            ],
            choices: [
                new AnalyzedChoice({
                    name: "Transfer",
                    methodName: "exerciseTransfer",
                    parameterName: "newOwner",
                    parameterType: new DamlLfType({
                        builtinType: DamlLfBuiltinType.text,
                    }),
                    returnType: new DamlLfType({
                        builtinType: DamlLfBuiltinType.text,
                    }),
                }),
            ],
        });

        const file = new TemplateBindingEmitter().emitTemplateFile(template);

        expect(file.path).toBe("generated/packages/sample-hash/main/iou.ts");
        expect(file.contents).toContain('import { DamlTemplate, decodeDamlValue, normalizeDamlCreatedEventSource, normalizeDamlExercisedEventSource } from "@distrohelena/canton-typescript-sdk/daml-interface";');
        expect(file.contents).toContain('import { generatedDamlTypeDescriptorRegistry } from "../../../support/descriptors.js";');
        expect(file.contents).toContain("export interface IouFields");
        expect(file.contents).toContain("export class Iou extends DamlTemplate implements IouFields");
        expect(file.contents).toContain("public constructor(contractId: string, issuer: string, owner: string)");
        expect(file.contents).toContain('public static readonly templateId = "sample-hash:Main:Iou";');
        expect(file.contents).toContain("public static fromCreatedEvent(event: DamlCreatedEventSource): Iou");
        expect(file.contents).toContain("public static fromExercisedEvent(event: DamlExercisedEventSource): IouTransferExercisedEvent");
        expect(file.contents).toContain("export class IouTransferExercisedEvent");
        expect(file.contents).toContain('public readonly choiceName = "Transfer" as const;');
        expect(file.contents).toContain("public readonly contractId: string;");
        expect(file.contents).toContain("public readonly argument: string;");
        expect(file.contents).toContain("public readonly result: string;");
        expect(file.contents).toContain("public readonly consuming: boolean;");
        expect(file.contents).toContain("public readonly metadata: DamlExercisedEventMetadata;");
        expect(file.contents).toContain('private static readonly descriptor: DamlTypeDescriptor = { kind: "record", fields: [{ damlLabel: "issuer", propertyName: "issuer", type: { kind: "primitive", primitive: "text" } }, { damlLabel: "owner", propertyName: "owner", type: { kind: "primitive", primitive: "text" } }] };');
        expect(file.contents).not.toContain("public static create(");
        expect(file.contents).not.toContain("public static exerciseTransfer(");
        expect(file.contents).not.toContain("public static decodeCreatedEvent(");
        expect(file.contents).not.toContain("public static decodeExercisedEvent(");
    });
});
