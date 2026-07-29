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
import { TypeScriptNameResolver } from "../../../src/daml-interface/emission/type-script-name-resolver.js";

describe("TypeScriptNameResolver", () => {
    it("derives unique generated names from full DAML identities while retaining DAML labels", () => {
        const templates = [
            createTemplate({
                packageId: "package-one",
                moduleName: "Sales.Order",
                templateName: "trade-order",
            }),
            createTemplate({
                packageId: "package_one",
                moduleName: "Sales_Order",
                templateName: "trade_order",
            }),
        ];

        const resolver = new TypeScriptNameResolver(templates);

        const emitter = new TemplateBindingEmitter(resolver);

        const files = templates.map((template) => emitter.emitTemplateFile(template));

        expect(new Set(files.map((file) => file.path)).size).toBe(2);
        expect(files.map((file) => file.path)).toEqual(
            expect.arrayContaining([
                expect.stringContaining("generated/packages/package-one-"),
            ]),
        );
        expect(new Set(files.map((file) => file.binding.namespaceAlias)).size).toBe(2);
        expect(new Set(files.map((file) => file.binding.className)).size).toBe(2);
        expect(new Set(files.map((file) => file.binding.createdEventTypeName)).size).toBe(2);
        expect(new Set(files.map((file) => file.binding.templateIdLiteral)).size).toBe(2);

        for (const file of files) {
            expect(file.binding.templateIdentityKey.replaceAll("\u0000", ":"))
                .toBe(file.binding.templateIdLiteral);
            expect(file.binding.createFields.map((field) => field.name)).toEqual([
                "get",
                "contractId",
                "constructor",
                "default",
                "trade-owner",
                "trade_owner",
            ]);
            expect(file.binding.createFields.map((field) => field.propertyName))
                .not.toContain("get");
            expect(file.binding.createFields.map((field) => field.propertyName))
                .not.toContain("contractId");
            expect(file.binding.createFields.map((field) => field.propertyName))
                .not.toContain("constructor");
            expect(file.binding.createFields.map((field) => field.propertyName))
                .not.toContain("default");
            expect(new Set(file.binding.createFields.map((field) => field.propertyName)).size)
                .toBe(file.binding.createFields.length);
            expect(new Set(file.binding.createFields.map((field) => field.constructorParameterName)).size)
                .toBe(file.binding.createFields.length);

            expect(file.binding.choices.map((choice) => choice.name)).toEqual([
                "get",
                "contractId",
                "constructor",
                "default",
                "approve-order",
                "approve_order",
            ]);
            expect(new Set(file.binding.choices.map((choice) => choice.methodName)).size)
                .toBe(file.binding.choices.length);
            expect(new Set(file.binding.choices.map((choice) => choice.choiceTypeName)).size)
                .toBe(file.binding.choices.length);
            expect(new Set(file.binding.choices.map((choice) => choice.exercisedEventTypeName)).size)
                .toBe(file.binding.choices.length);
            expect(file.binding.choices.map((choice) => choice.parameterName))
                .not.toContain("constructor");
            expect(file.binding.choices.map((choice) => choice.parameterName))
                .not.toContain("default");
        }
    });

    it("makes leading-digit generated identifiers valid", () => {
        const template = createTemplate({
            packageId: "9-package",
            moduleName: "9.Module",
            templateName: "9-template",
        });

        const resolver = new TypeScriptNameResolver([template]);

        const file = new TemplateBindingEmitter(resolver).emitTemplateFile(template);

        expect(file.binding.namespaceAlias).toMatch(/^_/);
        expect(file.binding.className).toMatch(/^_/);
    });

    it("reuses package/module names for separate templates with that identity", () => {
        const templates = [
            createTemplate({
                packageId: "sample-hash",
                moduleName: "Main",
                templateName: "First",
            }),
            createTemplate({
                packageId: "sample-hash",
                moduleName: "Main",
                templateName: "Second",
            }),
        ];

        const resolver = new TypeScriptNameResolver(templates);

        const files = templates.map((template) =>
            new TemplateBindingEmitter(resolver).emitTemplateFile(template));

        expect(files.map((file) => file.path)).toEqual([
            "generated/packages/sample-hash/main/first.ts",
            "generated/packages/sample-hash/main/second.ts",
        ]);
        expect(files.map((file) => file.binding.namespaceAlias)).toEqual([
            "SampleHashMain",
            "SampleHashMain",
        ]);
    });
});

function createTemplate(init: {
    packageId: string;
    moduleName: string;
    templateName: string;
}): AnalyzedTemplate {
    const text = (): DamlLfType => new DamlLfType({
        builtinType: DamlLfBuiltinType.text,
    });

    return new AnalyzedTemplate({
        templateId: new DamlLfTemplateId({
            packageId: init.packageId,
            moduleName: init.moduleName,
            templateName: init.templateName,
        }),
        className: "TradeOrder",
        fileName: "trade-order.ts",
        createFields: ["get", "contractId", "constructor", "default", "trade-owner", "trade_owner"]
            .map((name) => new AnalyzedTemplateField({
                name,
                propertyName: name,
                type: text(),
            })),
        choices: ["get", "contractId", "constructor", "default", "approve-order", "approve_order"]
            .map((name) => new AnalyzedChoice({
                name,
                methodName: name,
                parameterName: name,
                parameterType: text(),
                returnType: text(),
            })),
    });
}
