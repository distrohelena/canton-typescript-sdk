import { describe, expect, it } from "vitest";
import { DamlLfBuiltinType } from "../../../src/daml-lf/model/daml-lf-builtin-type.js";
import { DamlLfTemplateId } from "../../../src/daml-lf/model/daml-lf-template-id.js";
import { DamlLfType } from "../../../src/daml-lf/model/daml-lf-type.js";
import { TypeConReference } from "../../../src/daml-lf/model/type-con-reference.js";
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
        expect(file.contents).toContain('import { DamlEventSourceNormalizer, DamlMaterializationError, DamlTemplate, DamlValueConverter, DamlValueMaterializer } from "@distrohelena/canton-typescript-sdk/daml-interface";');
        expect(file.contents).toContain('import { GeneratedDamlTypeDescriptorRegistry } from "../../../support/descriptors.js";');
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
        expect(file.contents).toContain("DamlValueMaterializer.materialize<IouFields>(DamlValueConverter.decode(");
        expect(file.contents).toContain("fields.issuer,");
        expect(file.contents).toContain("fields.owner,");
        expect(file.contents).toContain("throw new DamlMaterializationError(\"choice\"");
        expect(file.contents).toContain("IouTransferExercisedEvent.assertTemplateIdentity(event.metadata.templateId);");
        expect(file.contents).toContain("throw new DamlMaterializationError(\"template ID\"");
        expect(file.contents).toContain('private static readonly descriptor: DamlTypeDescriptor = { kind: "record", fields: [{ damlLabel: "issuer", propertyName: "issuer", type: { kind: "primitive", primitive: "text" } }, { damlLabel: "owner", propertyName: "owner", type: { kind: "primitive", primitive: "text" } }] };');
        expect(file.contents).not.toContain("public static create(");
        expect(file.contents).not.toContain("public static exerciseTransfer(");
        expect(file.contents).not.toContain("public static decodeCreatedEvent(");
        expect(file.contents).not.toContain("public static decodeExercisedEvent(");
        expect(file.contents).not.toContain("as IouFields");
        expect(file.contents).not.toContain("fields.fields");
    });

    it("emits structural TypeScript types for anonymous DAML record, variant, and enum shapes", () => {
        const template = new AnalyzedTemplate({
            templateId: new DamlLfTemplateId({ packageId: "sample-hash", moduleName: "Main", templateName: "Shapes" }),
            className: "Shapes",
            fileName: "shapes.ts",
            createFields: [new AnalyzedTemplateField({
                name: "payload",
                propertyName: "payload",
                type: {
                    kind: "record",
                    fields: [{ damlLabel: "state", propertyName: "state", type: {
                        kind: "variant",
                        constructors: [{ constructor: "Open", payload: { kind: "enum", constructors: ["Ready", "Done"] } }],
                    } }],
                },
            })],
            choices: [],
        });

        const contents = new TemplateBindingEmitter().emitTemplateFile(template).contents;

        expect(contents).toContain('readonly payload: { readonly state: { readonly tag: "Open"; readonly value: "Ready" | "Done"; }; };');
        expect(contents).not.toContain("readonly payload: unknown;");
    });

    it("keeps legacy ContractId targets opaque while emitting string descriptors and types", () => {
        const externalHolding = new DamlLfType({
            typeConReference: new TypeConReference({
                packageId: "missing",
                moduleName: "Splice.Api.Token.HoldingV1",
                name: "Holding",
            }),
        });

        const contractId = new DamlLfType({
            builtinType: DamlLfBuiltinType.contractId,
            typeArguments: [externalHolding],
        });

        const template = new AnalyzedTemplate({
            templateId: new DamlLfTemplateId({
                packageId: "sample-hash",
                moduleName: "Main",
                templateName: "Opaque",
            }),
            className: "Opaque",
            fileName: "opaque.ts",
            createFields: [new AnalyzedTemplateField({
                name: "holding",
                propertyName: "holding",
                type: contractId,
            })],
            choices: [new AnalyzedChoice({
                name: "Transfer",
                methodName: "exerciseTransfer",
                parameterName: "newHolding",
                parameterType: contractId,
                returnType: contractId,
            })],
        });

        const contents = new TemplateBindingEmitter().emitTemplateFile(template, [
            {
                packageId: "sample-hash",
                moduleName: "Main",
                path: "generated/packages/sample-hash/main/types.ts",
                contents: "",
                namespaceAlias: "SampleHashMain",
                exportedTypeNames: [],
                exportedTypeNamesByIdentity: new Map(),
                fieldPropertyNames: new Map(),
            },
        ]);

        expect(contents.contents).toContain("readonly holding: string;");
        expect(contents.contents).toContain("public readonly argument: string;");
        expect(contents.contents).toContain("public readonly result: string;");
        expect(contents.contents.match(/\{ kind: \"contractId\" \}/g)).toHaveLength(3);
        expect(contents.contents).not.toContain("contract:");
        expect(contents.contents).not.toContain("Splice.Api.Token.HoldingV1");
        expect(contents.contents).not.toContain("Holding as");
    });
});
