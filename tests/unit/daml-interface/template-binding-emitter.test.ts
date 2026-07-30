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
import { GeneratedNamedTypeFile } from "../../../src/daml-interface/emission-model/generated-named-type-file.js";

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

    it("imports same-module named types without a package-hash alias", () => {
        const template = new AnalyzedTemplate({
            templateId: new DamlLfTemplateId({
                packageId: "426b9f3a906de72556356a5233e7ffbe4a985f143594f76bd7464f33df48da3c",
                moduleName: "Oz.Token.Kernel",
                templateName: "Holding",
            }),
            className: "Holding",
            fileName: "holding.ts",
            createFields: [new AnalyzedTemplateField({
                name: "archive",
                propertyName: "archive",
                type: {
                    kind: "namedReference",
                    identity: new TypeConReference({
                        packageId: "9e70a8b3510d617f8a136213f33d6a903a10ca0eeec76bb06ba55d1ed9680f69",
                        moduleName: "DA.Internal.Template",
                        name: "Archive",
                    }),
                },
            })],
            choices: [new AnalyzedChoice({
                name: "Burn",
                methodName: "exerciseBurn",
                parameterName: "burn",
                parameterType: {
                    kind: "namedReference",
                    identity: new TypeConReference({
                        packageId: "426b9f3a906de72556356a5233e7ffbe4a985f143594f76bd7464f33df48da3c",
                        moduleName: "Oz.Token.Kernel",
                        name: "Burn",
                    }),
                },
                returnType: new DamlLfType({ builtinType: DamlLfBuiltinType.unit }),
            })],
        });
        const typeFile = new GeneratedNamedTypeFile({
            path: "generated/packages/oz-research_0.0.1/oz/token/kernel/types.ts",
            contents: "",
            packageId: template.templateId.packageId,
            moduleName: template.templateId.moduleName,
            namespaceAlias: "OZResearchOzTokenKernel",
            exportedTypeNames: ["Burn"],
            exportedTypeNamesByIdentity: new Map([[
                `${template.templateId.packageId}\u0000${template.templateId.moduleName}\u0000Burn`,
                "Burn",
            ]]),
        });
        const externalTypeFile = new GeneratedNamedTypeFile({
            path: "generated/packages/ghc-stdlib-da-internal-template_1.0.0/da/internal/template/types.ts",
            contents: "",
            packageId: "9e70a8b3510d617f8a136213f33d6a903a10ca0eeec76bb06ba55d1ed9680f69",
            moduleName: "DA.Internal.Template",
            namespaceAlias: "GhcStdlibDAInternalTemplateDAInternalTemplate",
            exportedTypeNames: ["Archive"],
            exportedTypeNamesByIdentity: new Map([[
                "9e70a8b3510d617f8a136213f33d6a903a10ca0eeec76bb06ba55d1ed9680f69\u0000DA.Internal.Template\u0000Archive",
                "Archive",
            ]]),
        });

        const contents = new TemplateBindingEmitter().emitTemplateFile(template, [typeFile, externalTypeFile]).contents;

        expect(contents).toContain("import type { Burn } from");
        expect(contents).toContain("import type { Archive } from");
        expect(contents).not.toContain("426b9f3a906de72556356a5233e7ffbe4a985f143594f76bd7464f33df48da3cOzTokenKernelBurn");
    });

    it("emits applied named types and imports references nested in their type arguments", () => {
        const box = new TypeConReference({
            packageId: "sample-hash",
            moduleName: "Types",
            name: "Box",
        });

        const amount = new TypeConReference({
            packageId: "sample-hash",
            moduleName: "Types",
            name: "Amount",
        });

        const boxOfAmount = {
            kind: "namedReference" as const,
            identity: box,
            typeArguments: [{
                kind: "namedReference" as const,
                identity: amount,
                typeArguments: [],
            }],
        };

        const boxOfText = {
            kind: "namedReference" as const,
            identity: box,
            typeArguments: [{ kind: "primitive" as const, builtinType: DamlLfBuiltinType.text }],
        };

        const template = new AnalyzedTemplate({
            templateId: new DamlLfTemplateId({
                packageId: "sample-hash",
                moduleName: "Main",
                templateName: "GenericFields",
            }),
            className: "GenericFields",
            fileName: "generic-fields.ts",
            createFields: [new AnalyzedTemplateField({
                name: "value",
                propertyName: "value",
                type: boxOfAmount,
            })],
            choices: [new AnalyzedChoice({
                name: "Use",
                methodName: "exerciseUse",
                parameterName: "value",
                parameterType: boxOfAmount,
                returnType: boxOfText,
            })],
        });

        const typeFile = new GeneratedNamedTypeFile({
            path: "generated/packages/sample-hash/types/types.ts",
            contents: "",
            packageId: "sample-hash",
            moduleName: "Types",
            namespaceAlias: "SampleHashTypes",
            exportedTypeNames: ["Box", "Amount"],
            exportedTypeNamesByIdentity: new Map([
                ["sample-hash\u0000Types\u0000Box", "Box"],
                ["sample-hash\u0000Types\u0000Amount", "Amount"],
            ]),
        });

        const contents = new TemplateBindingEmitter().emitTemplateFile(template, [typeFile]).contents;

        expect(contents).toContain('import type { Amount, Box } from "../types/types.js";');
        expect(contents).not.toContain("Box<Amount> as");
        expect(contents).toContain("readonly value: Box<Amount>;");
        expect(contents).toContain("public readonly argument: Box<Amount>;");
        expect(contents).toContain("public readonly result: Box<string>;");
        expect(contents).toContain('type: { kind: "namedReference", identity: { packageId: "sample-hash", moduleName: "Types", entityName: "Box" }, typeArguments: [{ kind: "namedReference", identity: { packageId: "sample-hash", moduleName: "Types", entityName: "Amount" }, typeArguments: [] }] }');
    });
});
