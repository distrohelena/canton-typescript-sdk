import { describe, expect, it } from "vitest";
import { DamlLfBuiltinType } from "../../../src/daml-lf/model/daml-lf-builtin-type.js";
import { TypeConReference } from "../../../src/daml-lf/model/type-con-reference.js";
import { AnalyzedDamlTypeDefinition } from "../../../src/daml-interface/analysis/analyzed-daml-type-definition.js";
import {
    GeneratedTestSampleEmitter,
    GeneratedTestSampleImportCollector,
} from "../../../src/daml-interface/emission/generated-test-sample-emitter.js";
import { GeneratedNamedTypeFile } from "../../../src/daml-interface/emission-model/generated-named-type-file.js";

describe("GeneratedTestSampleEmitter", () => {
    it("emits separate TypeScript and JSON-ledger primitive, collection, record, and variant samples", () => {
        const settlement = identity("Settlement");

        const type = {
            kind: "record" as const,
            fields: [{
                damlLabel: "amount",
                propertyName: "amountValue",
                type: { kind: "primitive" as const, builtinType: DamlLfBuiltinType.numeric, numericScale: 2 },
            }, {
                damlLabel: "owner",
                propertyName: "owner",
                type: { kind: "primitive" as const, builtinType: DamlLfBuiltinType.party },
            }, {
                damlLabel: "when",
                propertyName: "when",
                type: { kind: "primitive" as const, builtinType: DamlLfBuiltinType.timestamp },
            }, {
                damlLabel: "marker",
                propertyName: "marker",
                type: { kind: "primitive" as const, builtinType: DamlLfBuiltinType.unit },
            }, {
                damlLabel: "number",
                propertyName: "number",
                type: { kind: "primitive" as const, builtinType: DamlLfBuiltinType.int64 },
            }, {
                damlLabel: "labels",
                propertyName: "labels",
                type: { kind: "textMap" as const, value: { kind: "primitive" as const, builtinType: DamlLfBuiltinType.text } },
            }, {
                damlLabel: "pairs",
                propertyName: "pairs",
                type: {
                    kind: "genMap" as const,
                    key: { kind: "primitive" as const, builtinType: DamlLfBuiltinType.text },
                    value: { kind: "primitive" as const, builtinType: DamlLfBuiltinType.bool },
                },
            }, {
                damlLabel: "state",
                propertyName: "state",
                type: {
                    kind: "variant" as const,
                    constructors: [{ constructor: "Open", payload: { kind: "primitive" as const, builtinType: DamlLfBuiltinType.date } }],
                },
            }],
        };

        const imports = new GeneratedTestSampleImportCollector();

        const context = sampleContext([], [], imports);

        expect(GeneratedTestSampleEmitter.emitTypeScriptExpressionOrThrow(type, context)).toContain('amountValue: new DamlNumeric("1.00")');
        expect(GeneratedTestSampleEmitter.emitTypeScriptExpressionOrThrow(type, context)).toContain("number: 1n");
        expect(GeneratedTestSampleEmitter.emitTypeScriptExpressionOrThrow(type, context)).toContain('state: { tag: "Open", value: new DamlDate(1) }');
        expect(GeneratedTestSampleEmitter.emitLedgerExpressionOrThrow(type, context)).toContain('amount: "1.00"');
        expect(GeneratedTestSampleEmitter.emitLedgerExpressionOrThrow(type, context)).toContain("marker: {}");
        expect(GeneratedTestSampleEmitter.emitLedgerExpressionOrThrow(type, context)).toContain('number: "1"');
        expect(GeneratedTestSampleEmitter.emitLedgerExpressionOrThrow(type, context)).toContain('labels: { "sample-key": "sample text" }');
        expect(GeneratedTestSampleEmitter.emitLedgerExpressionOrThrow(type, context)).toContain('pairs: [["sample text", true]]');
        expect(imports.imports).toEqual(expect.arrayContaining([
            expect.objectContaining({ exportedName: "DamlNumeric" }),
            expect.objectContaining({ exportedName: "DamlDate" }),
        ]));
        void settlement;
    });

    it("uses null for ledger optionals", () => {
        const optional = {
            kind: "optional" as const,
            element: { kind: "primitive" as const, builtinType: DamlLfBuiltinType.text },
        };

        expect(GeneratedTestSampleEmitter.emitLedgerExpressionOrThrow(optional, sampleContext())).toBe("null");
        expect(GeneratedTestSampleEmitter.emitTypeScriptExpressionOrThrow(optional, sampleContext())).toBe("undefined");
    });

    it("instantiates generic named records independently and uses resolved record aliases", () => {
        const node = identity("Node");

        const definition: AnalyzedDamlTypeDefinition = {
            identity: node,
            kind: "record",
            typeParameters: [{ name: "T", internedStringIndex: 0, kind: { kind: "star" } }],
            fields: [{
                damlLabel: "value",
                propertyName: "value",
                type: { kind: "typeVariable", name: "T", internedStringIndex: 0 },
            }, {
                damlLabel: "next",
                propertyName: "next",
                type: {
                    kind: "optional",
                    element: {
                        kind: "namedReference",
                        identity: node,
                        typeArguments: [{ kind: "typeVariable", name: "T", internedStringIndex: 0 }],
                    },
                },
            }],
        };

        const files = [namedFile(node, "SampleNode", "nodeValue")];

        const imports = new GeneratedTestSampleImportCollector();

        const context = sampleContext([definition], files, imports);

        const textNode = {
            kind: "namedReference" as const,
            identity: node,
            typeArguments: [{ kind: "primitive" as const, builtinType: DamlLfBuiltinType.text }],
        };

        const numberNode = {
            kind: "namedReference" as const,
            identity: node,
            typeArguments: [{ kind: "primitive" as const, builtinType: DamlLfBuiltinType.int64 }],
        };

        expect(GeneratedTestSampleEmitter.emitTypeScriptExpressionOrThrow(textNode, context)).toContain('nodeValue: "sample text"');
        expect(GeneratedTestSampleEmitter.emitTypeScriptExpressionOrThrow(numberNode, context)).toContain("nodeValue: 1n");
        expect(GeneratedTestSampleEmitter.emitLedgerExpressionOrThrow(textNode, context)).toContain("next: null");
        expect(imports.imports).toContainEqual(expect.objectContaining({ exportedName: "SampleNode" }));
    });

    it("finds finite exits through direct, indirect, and generic recursion", () => {
        const direct = identity("Direct");

        const left = identity("Left");

        const right = identity("Right");

        const generic = identity("Generic");

        const definitions: readonly AnalyzedDamlTypeDefinition[] = [{
            identity: direct,
            kind: "record",
            typeParameters: [],
            fields: [{ damlLabel: "next", propertyName: "next", type: { kind: "optional", element: { kind: "namedReference", identity: direct, typeArguments: [] } } }],
        }, {
            identity: left,
            kind: "record",
            typeParameters: [],
            fields: [{ damlLabel: "right", propertyName: "right", type: { kind: "namedReference", identity: right, typeArguments: [] } }],
        }, {
            identity: right,
            kind: "variant",
            typeParameters: [],
            constructors: [
                { constructor: "Again", payload: { kind: "namedReference", identity: left, typeArguments: [] } },
                { constructor: "Done", payload: { kind: "primitive", builtinType: DamlLfBuiltinType.unit } },
            ],
        }, {
            identity: generic,
            kind: "record",
            typeParameters: [{ name: "T", internedStringIndex: 0, kind: { kind: "star" } }],
            fields: [{ damlLabel: "next", propertyName: "next", type: { kind: "optional", element: { kind: "namedReference", identity: generic, typeArguments: [{ kind: "typeVariable", name: "T", internedStringIndex: 0 }] } } }],
        }];

        const context = sampleContext(definitions, definitions.map((definition) => namedFile(definition.identity, definition.identity.name)));

        expect(GeneratedTestSampleEmitter.emitLedgerExpressionOrThrow({ kind: "namedReference", identity: direct, typeArguments: [] }, context)).toContain("next: null");
        expect(GeneratedTestSampleEmitter.emitLedgerExpressionOrThrow({ kind: "namedReference", identity: left, typeArguments: [] }, context)).toContain('tag: "Done"');
        expect(GeneratedTestSampleEmitter.emitLedgerExpressionOrThrow({ kind: "namedReference", identity: generic, typeArguments: [{ kind: "primitive", builtinType: DamlLfBuiltinType.text }] }, context)).toContain("next: null");
    });

    it("rejects strict uninhabitable recursion with its identity and value path", () => {
        const loop = identity("Loop");

        const definition: AnalyzedDamlTypeDefinition = {
            identity: loop,
            kind: "record",
            typeParameters: [],
            fields: [{ damlLabel: "next", propertyName: "next", type: { kind: "namedReference", identity: loop, typeArguments: [] } }],
        };

        expect(() => GeneratedTestSampleEmitter.emitLedgerExpressionOrThrow(
            { kind: "namedReference", identity: loop, typeArguments: [] },
            sampleContext([definition], [namedFile(loop, "Loop")], undefined, ["fixture"]),
        )).toThrow("sample:Module:Loop");
        expect(() => GeneratedTestSampleEmitter.emitLedgerExpressionOrThrow(
            { kind: "namedReference", identity: loop, typeArguments: [] },
            sampleContext([definition], [namedFile(loop, "Loop")], undefined, ["fixture"]),
        )).toThrow("fixture.next");
    });
});

function identity(name: string): TypeConReference {
    return new TypeConReference({ packageId: "sample", moduleName: "Module", name });
}

function namedFile(identityValue: TypeConReference, exportedName: string, propertyName = "value"): GeneratedNamedTypeFile {
    const key = `${identityValue.packageId}\u0000${identityValue.moduleName}\u0000${identityValue.name}`;

    return new GeneratedNamedTypeFile({
        path: "generated/packages/sample/module/types.ts",
        contents: "",
        packageId: identityValue.packageId,
        moduleName: identityValue.moduleName,
        namespaceAlias: "SampleModule",
        exportedTypeNames: [exportedName],
        exportedTypeNamesByIdentity: new Map([[key, exportedName]]),
        fieldPropertyNames: new Map([[`${key}\u0000field\u00000`, propertyName]]),
    });
}

function sampleContext(
    definitions: readonly AnalyzedDamlTypeDefinition[] = [],
    namedTypeFiles: readonly GeneratedNamedTypeFile[] = [],
    imports?: GeneratedTestSampleImportCollector,
    path: readonly string[] = ["value"],
) {
    return {
        definitions,
        namedTypeFiles,
        imports,
        path,
        maximumDepth: 3,
    };
}
