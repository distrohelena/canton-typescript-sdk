import { DamlLfBuiltinType } from "../../daml-lf/model/daml-lf-builtin-type.js";
import { AnalyzedDamlType } from "../analysis/analyzed-daml-type.js";
import { AnalyzedDamlTypeDefinition } from "../analysis/analyzed-daml-type-definition.js";
import { DamlInterfaceAnalysisResult } from "../analysis/daml-interface-analyzer.js";
import { GeneratedDamlInterfaceProject } from "../emission-model/generated-daml-interface-project.js";
import { GeneratedChoiceBinding } from "../emission-model/generated-choice-binding.js";
import { GeneratedNamedTypeFile } from "../emission-model/generated-named-type-file.js";
import { GeneratedSpecFile } from "../emission-model/generated-spec-file.js";
import { GeneratedTemplateBindingFile } from "../emission-model/generated-template-binding-file.js";
import {
    GeneratedTestSampleEmitter,
    GeneratedTestSampleImport,
    GeneratedTestSampleImportCollector,
} from "./generated-test-sample-emitter.js";

/** Emits dependency-free Node test modules alongside every generated DAML module. */
export class GeneratedSpecEmitter {
    private constructor() {}

    /** Emits exactly one sibling `.spec.ts` module for every generated production module. */
    public static emitSpecFiles(
        project: GeneratedDamlInterfaceProject,
        analysis: DamlInterfaceAnalysisResult,
    ): readonly GeneratedSpecFile[] {
        return project.productionFiles.map((file) => new GeneratedSpecFile(
            this.specPath(file.path),
            file instanceof GeneratedTemplateBindingFile
                ? this.emitTemplateSpec(file, project, analysis)
                : file instanceof GeneratedNamedTypeFile
                    ? this.emitNamedTypeSpec(file, project, analysis)
                    : this.emitSupportSpec(file.path, project, analysis),
            file.path,
        ));
    }

    private static emitTemplateSpec(
        file: GeneratedTemplateBindingFile,
        project: GeneratedDamlInterfaceProject,
        analysis: DamlInterfaceAnalysisResult,
    ): string {
        const imports = new GeneratedTestSampleImportCollector();

        const binding = file.binding;

        const sampleContext = this.sampleContext(project, analysis, imports);

        const expectedFields = binding.createFields.map((field) => ({
            propertyName: field.propertyName,
            expression: GeneratedTestSampleEmitter.emitTypeScriptExpressionOrThrow(this.normalizeType(field.type), sampleContext),
        }));

        const payload = this.emitObject(binding.createFields.map((field) => ({
            key: field.name,
            expression: GeneratedTestSampleEmitter.emitLedgerExpressionOrThrow(this.normalizeType(field.type), sampleContext),
        })));

        const localImports = [binding.className, ...binding.choices.map((choice) => choice.exercisedEventTypeName)];

        const choiceBlocks = binding.choices.map((choice) => this.emitChoiceSpec(binding.templateIdLiteral, binding.className, choice, sampleContext));

        const lines = [
            ...this.nodeImports(),
            ...this.emitSampleImports(imports.imports, this.specPath(file.path)),
            `import { ${localImports.join(", ")} } from ${JSON.stringify(this.modulePath(this.specPath(file.path), file.path))};`,
            "",
            `test(${JSON.stringify(`${binding.className} materializes a created event`)}, () => {`,
            `    const expected = ${this.emitObject(expectedFields.map((field) => ({ key: field.propertyName, expression: field.expression })))};`,
            `    const materialized = ${binding.className}.fromCreatedEvent({`,
            '        contract_id: "#sample-contract-id",',
            `        template_id: ${this.identityExpression(binding.templateIdLiteral)},`,
            `        create_arguments: ${payload},`,
            "    });",
            `    assert.ok(materialized instanceof ${binding.className});`,
            '    assert.equal(materialized.contractId, "#sample-contract-id");',
            ...expectedFields.map((field) => `    assert.deepEqual(materialized.${field.propertyName}, expected.${field.propertyName});`),
            "});",
            ...choiceBlocks.flat(),
            "",
        ];

        return lines.join("\n");
    }

    private static emitNamedTypeSpec(
        file: GeneratedNamedTypeFile,
        project: GeneratedDamlInterfaceProject,
        analysis: DamlInterfaceAnalysisResult,
    ): string {
        const definitions = analysis.typeDefinitions.filter((definition) =>
            definition.identity.packageId === file.packageId
            && definition.identity.moduleName === file.moduleName);

        const imports = new GeneratedTestSampleImportCollector();

        const context = this.sampleContext(project, analysis, imports);

        const samples: string[] = [];

        for (const definition of definitions) {
            const exportedName = file.exportedTypeNamesByIdentity.get(this.definitionKey(definition));

            if (exportedName === undefined) {
                throw new Error(`Cannot emit generated spec for unresolved type '${definition.identity.name}'`);
            }

            const typeArguments = this.sampleTypeArguments(definition);

            const reference: AnalyzedDamlType = {
                kind: "namedReference",
                identity: definition.identity,
                typeArguments,
            };

            const sample = GeneratedTestSampleEmitter.emitTypeScriptExpressionOrThrow(reference, context);

            if (definition.kind === "enum") {
                for (const constructor of definition.constructors) {
                    samples.push(`const ${this.safeLocalName(exportedName, constructor)}: ${exportedName} = ${JSON.stringify(constructor)};`);
                }
            } else if (definition.kind === "variant") {
                for (const constructor of definition.constructors) {
                    const variant: AnalyzedDamlType = {
                        kind: "variant",
                        constructors: [constructor],
                    };

                    const expression = GeneratedTestSampleEmitter.emitTypeScriptExpressionOrThrow(variant, {
                        ...context,
                        typeVariableBindings: new Map((definition.typeParameters ?? []).map((parameter) => [
                            `${parameter.name}\u0000${parameter.internedStringIndex}`,
                            { kind: "primitive" as const, builtinType: DamlLfBuiltinType.text },
                        ])),
                    });

                    samples.push(`const ${this.safeLocalName(exportedName, constructor.constructor)} = (${expression} satisfies ${this.appliedTypeName(exportedName, typeArguments)});`);
                }
            } else {
                samples.push(`const ${this.safeLocalName(exportedName, "sample")} = ${sample};`);
            }
        }

        const namedImports = [...file.exportedTypeNames].sort();

        return [
            ...this.nodeImports(),
            ...this.emitSampleImports(imports.imports.filter((entry) => entry.modulePath !== file.path), this.specPath(file.path)),
            ...(namedImports.length === 0 ? [] : [`import type { ${namedImports.join(", ")} } from ${JSON.stringify(this.modulePath(this.specPath(file.path), file.path))};`]),
            "",
            ...samples,
            "",
            `test(${JSON.stringify(`${file.packageId}:${file.moduleName} named types compile`)}, () => {`,
            "    assert.ok(true);",
            "});",
            "",
        ].join("\n");
    }

    private static emitChoiceSpec(
        templateIdLiteral: string,
        className: string,
        choice: GeneratedChoiceBinding,
        sampleContext: ReturnType<typeof GeneratedSpecEmitter.sampleContext>,
    ): readonly string[] {
        const argument = GeneratedTestSampleEmitter.emitTypeScriptExpressionOrThrow(this.normalizeType(choice.parameterType), sampleContext);

        const result = GeneratedTestSampleEmitter.emitTypeScriptExpressionOrThrow(this.normalizeType(choice.returnType), sampleContext);

        const ledgerArgument = GeneratedTestSampleEmitter.emitLedgerExpressionOrThrow(this.normalizeType(choice.parameterType), sampleContext);

        const ledgerResult = GeneratedTestSampleEmitter.emitLedgerExpressionOrThrow(this.normalizeType(choice.returnType), sampleContext);

        const metadata = this.identityExpression(templateIdLiteral);

        return [
            "",
            `test(${JSON.stringify(`${className}.${choice.name} materializes an exercised event`)}, () => {`,
            `    const expectedArgument = ${argument};`,
            `    const expectedResult = ${result};`,
            `    const materialized = ${className}.fromExercisedEvent({`,
            '        contract_id: "#sample-contract-id",',
            `        template_id: ${metadata},`,
            `        choice: ${JSON.stringify(choice.name)},`,
            "        consuming: false,",
            `        choice_argument: ${ledgerArgument},`,
            `        exercise_result: ${ledgerResult},`,
            "    });",
            `    assert.ok(materialized instanceof ${choice.exercisedEventTypeName});`,
            '    assert.equal(materialized.contractId, "#sample-contract-id");',
            "    assert.equal(materialized.consuming, false);",
            "    assert.deepEqual(materialized.argument, expectedArgument);",
            "    assert.deepEqual(materialized.result, expectedResult);",
            `    assert.deepEqual(materialized.metadata, { templateId: ${metadata} });`,
            "});",
        ];
    }

    private static emitSupportSpec(
        path: string,
        project: GeneratedDamlInterfaceProject,
        analysis: DamlInterfaceAnalysisResult,
    ): string {
        if (path === "generated/support/contracts.ts") {
            return [
                ...this.nodeImports(),
                'import type { GeneratedContractId } from "./contracts.js";',
                "",
                'const sampleContractId = "#sample-contract-id" satisfies GeneratedContractId;',
                "",
                'test("generated contract support types compile", () => {',
                '    assert.equal(sampleContractId, "#sample-contract-id");',
                "});",
                "",
            ].join("\n");
        } else if (path === "generated/support/runtime.ts") {
            return [
                ...this.nodeImports(),
                'import type { DamlDate, DamlNumeric, DamlParty, DamlTimestamp, DamlUnit } from "./runtime.js";',
                "",
                "const runtimeTypes = undefined as unknown as readonly [DamlDate, DamlNumeric, DamlParty, DamlTimestamp, DamlUnit];",
                "",
                'test("generated runtime support types compile", () => {',
                "    void runtimeTypes;",
                "    assert.ok(true);",
                "});",
                "",
            ].join("\n");
        } else if (path === "generated/support/descriptors.ts") {
            return this.emitDescriptorSpec(path, project, analysis);
        } else if (path === "generated/registry.ts") {
            return [
                ...this.nodeImports(),
                'import { GeneratedRegistry } from "./registry.js";',
                "",
                'test("generated registry exposes static event readers", () => {',
                '    assert.equal(typeof GeneratedRegistry.fromCreatedEvent, "function");',
                '    assert.equal(typeof GeneratedRegistry.fromExercisedEvent, "function");',
                "});",
                "",
            ].join("\n");
        } else if (path === "generated/index.ts") {
            return [
                ...this.nodeImports(),
                'import * as Generated from "./index.js";',
                "",
                'test("generated project index exports the registry", () => {',
                '    assert.equal(typeof Generated.GeneratedRegistry, "function");',
                "});",
                "",
            ].join("\n");
        }

        return [
            ...this.nodeImports(),
            `import * as GeneratedNamespace from ${JSON.stringify(this.modulePath(this.specPath(path), path))};`,
            "",
            `test(${JSON.stringify(`${path} exports its generated namespace`)}, () => {`,
            "    assert.ok(GeneratedNamespace !== undefined);",
            "});",
            "",
        ].join("\n");
    }

    private static emitDescriptorSpec(
        path: string,
        project: GeneratedDamlInterfaceProject,
        analysis: DamlInterfaceAnalysisResult,
    ): string {
        const resolveLines = analysis.typeDefinitions.flatMap((definition) => {
            const typeParameterCount = definition.kind === "enum" ? 0 : (definition.typeParameters?.length ?? 0);

            const argumentsExpression = typeParameterCount === 0
                ? "[]"
                : `[${Array.from({ length: typeParameterCount }, () => '{ kind: "primitive", primitive: "text" }').join(", ")}]`;

            const identity = this.identityExpression(`${definition.identity.packageId}:${definition.identity.moduleName}:${definition.identity.name}`);

            return [
                `    assert.notEqual(GeneratedDamlTypeDescriptorRegistry.resolve(${identity}, ${argumentsExpression}), undefined);`,
            ];
        });

        return [
            ...this.nodeImports(),
            `import { GeneratedDamlTypeDescriptorRegistry } from ${JSON.stringify(this.modulePath(this.specPath(path), path))};`,
            "",
            'test("generated descriptor registry resolves every emitted type", () => {',
            ...resolveLines,
            "    assert.ok(true);",
            "});",
            "",
        ].join("\n");
    }

    private static sampleContext(
        project: GeneratedDamlInterfaceProject,
        analysis: DamlInterfaceAnalysisResult,
        imports: GeneratedTestSampleImportCollector,
    ): {
        readonly definitions: readonly AnalyzedDamlTypeDefinition[];
        readonly namedTypeFiles: readonly GeneratedNamedTypeFile[];
        readonly imports: GeneratedTestSampleImportCollector;
    } {
        return {
            definitions: analysis.typeDefinitions.map((definition) => this.normalizeDefinition(definition)),
            namedTypeFiles: project.namedTypeFiles,
            imports,
        };
    }

    private static emitSampleImports(
        imports: readonly GeneratedTestSampleImport[],
        sourcePath: string,
    ): readonly string[] {
        return imports.map((entry) => {
            const modulePath = entry.modulePath.startsWith("generated/")
                ? this.modulePath(sourcePath, entry.modulePath)
                : entry.modulePath;

            const imported = entry.exportedName === entry.localName
                ? entry.exportedName
                : `${entry.exportedName} as ${entry.localName}`;

            return `import${entry.typeOnly ? " type" : ""} { ${imported} } from ${JSON.stringify(modulePath)};`;
        });
    }

    private static sampleTypeArguments(definition: AnalyzedDamlTypeDefinition): readonly AnalyzedDamlType[] {
        if (definition.kind === "enum") {
            return [];
        }

        return (definition.typeParameters ?? []).map(() => ({
            kind: "primitive" as const,
            builtinType: DamlLfBuiltinType.text,
        }));
    }

    private static appliedTypeName(name: string, typeArguments: readonly AnalyzedDamlType[]): string {
        return typeArguments.length === 0 ? name : `${name}<${typeArguments.map(() => "string").join(", ")}>`;
    }

    private static normalizeType(type: AnalyzedDamlType): AnalyzedDamlType {
        switch (type.kind) {
            case "optional":
                return { ...type, element: this.normalizeType(type.element) };
            case "list":
                return { ...type, element: this.normalizeType(type.element) };
            case "textMap":
                return { ...type, value: this.normalizeType(type.value) };
            case "genMap":
                return { ...type, key: this.normalizeType(type.key), value: this.normalizeType(type.value) };
            case "record":
                return { ...type, fields: type.fields.map((field) => ({ ...field, type: this.normalizeType(field.type) })) };
            case "variant":
                return { ...type, constructors: type.constructors.map((constructor) => ({ ...constructor, payload: this.normalizeType(constructor.payload) })) };
            case "namedReference":
                return { ...type, typeArguments: (type.typeArguments ?? []).map((argument) => this.normalizeType(argument)) };
            default:
                return type;
        }
    }

    private static normalizeDefinition(definition: AnalyzedDamlTypeDefinition): AnalyzedDamlTypeDefinition {
        if (definition.kind === "enum") {
            return definition;
        } else if (definition.kind === "record") {
            return {
                ...definition,
                typeParameters: definition.typeParameters ?? [],
                fields: definition.fields.map((field) => ({ ...field, type: this.normalizeType(field.type) })),
            };
        }

        return {
            ...definition,
            typeParameters: definition.typeParameters ?? [],
            constructors: definition.constructors.map((constructor) => ({
                ...constructor,
                payload: this.normalizeType(constructor.payload),
            })),
        };
    }

    private static nodeImports(): readonly string[] {
        return [
            'import assert from "node:assert/strict";',
            'import { test } from "node:test";',
        ];
    }

    private static emitObject(entries: readonly { readonly key: string; readonly expression: string }[]): string {
        return `{ ${entries.map((entry) => `${JSON.stringify(entry.key)}: ${entry.expression}`).join(", ")} }`;
    }

    private static identityExpression(templateId: string): string {
        const [packageId, moduleName, entityName] = templateId.split(":");

        return `{ packageId: ${JSON.stringify(packageId)}, moduleName: ${JSON.stringify(moduleName)}, entityName: ${JSON.stringify(entityName)} }`;
    }

    private static definitionKey(definition: AnalyzedDamlTypeDefinition): string {
        return `${definition.identity.packageId}\u0000${definition.identity.moduleName}\u0000${definition.identity.name}`;
    }

    private static safeLocalName(typeName: string, suffix: string): string {
        return `${typeName.replace(/[^A-Za-z0-9_$]/g, "_")}_${suffix.replace(/[^A-Za-z0-9_$]/g, "_")}`;
    }

    private static specPath(path: string): string {
        return path.replace(/\.ts$/, ".spec.ts");
    }

    private static modulePath(fromPath: string, toPath: string): string {
        const fromDirectory = fromPath.split("/").slice(0, -1);

        const target = toPath.replace(/\.ts$/, ".js").split("/");

        let shared = 0;

        while (shared < fromDirectory.length && fromDirectory[shared] === target[shared]) {
            shared += 1;
        }

        const upwards = fromDirectory.slice(shared).map(() => "..");

        const downwards = target.slice(shared);

        const segments = [...upwards, ...downwards];

        return segments.length === 0 ? "./index.js" : segments[0] === ".."
            ? segments.join("/")
            : `./${segments.join("/")}`;
    }
}
