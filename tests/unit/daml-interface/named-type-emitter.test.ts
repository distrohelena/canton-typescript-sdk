import { describe, expect, it } from "vitest";
import { DamlLfBuiltinType } from "../../../src/daml-lf/model/daml-lf-builtin-type.js";
import { TypeConReference } from "../../../src/daml-lf/model/type-con-reference.js";
import { AnalyzedDamlTypeDefinition } from "../../../src/daml-interface/analysis/analyzed-daml-type-definition.js";
import { NamedTypeEmitter } from "../../../src/daml-interface/emission/named-type-emitter.js";

describe("NamedTypeEmitter", () => {
    it("emits readonly records, discriminated variants, enums, and recursive references per collision-safe module", () => {
        const files = new NamedTypeEmitter().emitNamedTypeFiles(definitions());

        expect(files).toHaveLength(4);
        expect(new Set(files.map((file) => file.path)).size).toBe(4);

        const main = files.find((file) => file.path.includes("sample-hash/main/types.ts"));

        expect(main?.contents).toContain('import type { External } from "../../other-package/other/module/types.js";');
        expect(main?.contents).toContain("export interface Settlement {");
        expect(main?.contents).toContain("    readonly settlementOwner: string;");
        expect(main?.contents).toContain("export type Instruction =");
        expect(main?.contents).toContain('    | { readonly tag: "Deliver"; readonly value: Settlement; }');
        expect(main?.contents).toContain('    | { readonly tag: "Cancel"; readonly value: string; };');
        expect(main?.contents).toContain('export type Status = "Pending" | "Settled";');
        expect(main?.contents).toContain("readonly next: Node | undefined;");
        expect(main?.contents).toContain("readonly right: MutualB;");
        expect(main?.contents).toContain("readonly foreign: External;");
    });
});

function definitions(): readonly AnalyzedDamlTypeDefinition[] {
    const reference = (name: string, packageId = "sample-hash", moduleName = "Main") =>
        new TypeConReference({ packageId, moduleName, name });

    const text = { kind: "primitive" as const, builtinType: DamlLfBuiltinType.text };

    const named = (name: string, packageId?: string, moduleName?: string) => ({
        kind: "namedReference" as const,
        identity: reference(name, packageId, moduleName),
    });

    return [
        {
            identity: reference("Settlement"),
            kind: "record",
            fields: [
                { damlLabel: "settlement-owner", propertyName: "settlementOwner", type: text },
                { damlLabel: "foreign", propertyName: "foreign", type: named("External", "other-package", "Other.Module") },
            ],
        },
        {
            identity: reference("Instruction"),
            kind: "variant",
            constructors: [
                { constructor: "Deliver", payload: named("Settlement") },
                { constructor: "Cancel", payload: text },
            ],
        },
        { identity: reference("Status"), kind: "enum", constructors: ["Pending", "Settled"] },
        {
            identity: reference("Node"),
            kind: "record",
            fields: [{ damlLabel: "next", propertyName: "next", type: { kind: "optional", element: named("Node") } }],
        },
        {
            identity: reference("MutualA"),
            kind: "record",
            fields: [{ damlLabel: "right", propertyName: "right", type: named("MutualB") }],
        },
        {
            identity: reference("MutualB"),
            kind: "record",
            fields: [{ damlLabel: "left", propertyName: "left", type: named("MutualA") }],
        },
        {
            identity: reference("External", "other-package", "Other.Module"),
            kind: "record",
            fields: [{ damlLabel: "value", propertyName: "value", type: text }],
        },
        {
            identity: reference("PackageOne", "package-one", "Main"),
            kind: "record",
            fields: [],
        },
        {
            identity: reference("PackageOne", "package_one", "Main"),
            kind: "record",
            fields: [],
        },
    ];
}
