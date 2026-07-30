import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
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

    it("emits valid, collision-safe TypeScript identifiers and runtime primitive imports", () => {
        const identity = (name: string) => new TypeConReference({
            packageId: "sample-hash",
            moduleName: "Main",
            name,
        });

        const file = new NamedTypeEmitter().emitNamedTypeFiles([
            {
                identity: identity("9-value"),
                kind: "record",
                fields: [{
                    damlLabel: "values",
                    propertyName: "values",
                    type: { kind: "primitive", builtinType: DamlLfBuiltinType.date },
                }, {
                    damlLabel: "time",
                    propertyName: "time",
                    type: { kind: "primitive", builtinType: DamlLfBuiltinType.timestamp },
                }, {
                    damlLabel: "amount",
                    propertyName: "amount",
                    type: { kind: "primitive", builtinType: DamlLfBuiltinType.numeric, numericScale: 2 },
                }, {
                    damlLabel: "owner",
                    propertyName: "owner",
                    type: { kind: "primitive", builtinType: DamlLfBuiltinType.party },
                }, {
                    damlLabel: "marker",
                    propertyName: "marker",
                    type: { kind: "primitive", builtinType: DamlLfBuiltinType.unit },
                }],
            },
            { identity: identity("same-value"), kind: "record", fields: [] },
            { identity: identity("same_value"), kind: "record", fields: [] },
        ])[0];

        expect(file.contents).toContain('import type { DamlDate, DamlNumeric, DamlParty, DamlTimestamp, DamlUnit } from "../../../support/runtime.js";');
        expect(file.contents).toContain("export interface _9Value {");
        expect(file.contents).toMatch(/export interface SameValue_[a-z0-9]+/);
        expect(file.contents).not.toMatch(/export interface SameValue-[a-z0-9]+/);
        expect(file.contents).toContain("readonly values: DamlDate;");
        expect(file.contents).toContain("readonly time: DamlTimestamp;");
        expect(file.contents).toContain("readonly amount: DamlNumeric;");
        expect(file.contents).toContain("readonly owner: DamlParty;");
        expect(file.contents).toContain("readonly marker: DamlUnit;");
    });

    it("parenthesizes union list elements so readonly arrays preserve DAML precedence", () => {
        const file = new NamedTypeEmitter().emitNamedTypeFiles([{
            identity: new TypeConReference({ packageId: "sample-hash", moduleName: "Main", name: "OptionalList" }),
            kind: "record",
            fields: [{
                damlLabel: "values",
                propertyName: "values",
                type: {
                    kind: "list",
                    element: {
                        kind: "optional",
                        element: { kind: "primitive", builtinType: DamlLfBuiltinType.text },
                    },
                },
            }],
        }])[0];

        expect(file.contents).toContain("readonly values: readonly (string | undefined)[];");
        expect(file.contents).not.toContain("readonly values: readonly string | undefined[];");
    });

    it("aliases every external named reference by full identity so A.Foo resolves B.Foo", async () => {
        const reference = (moduleName: string) => new TypeConReference({
            packageId: "sample-hash",
            moduleName,
            name: "Foo",
        });

        const files = new NamedTypeEmitter().emitNamedTypeFiles([
            {
                identity: reference("A"),
                kind: "record",
                fields: [{
                    damlLabel: "foreign",
                    propertyName: "foreign",
                    type: { kind: "namedReference", identity: reference("B") },
                }],
            },
            { identity: reference("B"), kind: "record", fields: [] },
        ]);

        const a = files.find((file) => file.path.endsWith("/a/types.ts"));

        expect(a?.contents).toContain('import type { Foo as SampleHashBFoo } from "../b/types.js";');
        expect(a?.contents).toContain("readonly foreign: SampleHashBFoo;");

        const outputDirectory = await mkdtemp(join(tmpdir(), "daml-named-types-"));

        try {
            for (const file of files) {
                const path = join(outputDirectory, file.path);

                await mkdir(dirname(path), { recursive: true });
                await writeFile(path, file.contents, "utf8");
            }

            execFileSync(
                process.execPath,
                [
                    "./node_modules/typescript/bin/tsc",
                    "--noEmit",
                    "--module",
                    "NodeNext",
                    "--moduleResolution",
                    "NodeNext",
                    join(outputDirectory, a!.path),
                ],
                { cwd: process.cwd(), stdio: "inherit" },
            );
        } finally {
            await rm(outputDirectory, { recursive: true, force: true });
        }
    });

    it("reserves runtime type bindings when a named declaration has the same name", async () => {
        const identity = new TypeConReference({
            packageId: "sample-hash",
            moduleName: "Main",
            name: "DamlDate",
        });

        const file = new NamedTypeEmitter().emitNamedTypeFiles([{
            identity,
            kind: "record",
            fields: [{
                damlLabel: "date",
                propertyName: "date",
                type: { kind: "primitive", builtinType: DamlLfBuiltinType.date },
            }],
        }])[0];

        expect(file.exportedTypeNames).toEqual(["DamlDateType"]);
        expect(file.contents).toContain("export interface DamlDateType {");
        expect(file.contents).toContain("readonly date: DamlDate;");

        const outputDirectory = await mkdtemp(join(tmpdir(), "daml-runtime-name-"));

        try {
            const runtimePath = join(outputDirectory, "generated/support/runtime.ts");

            const typePath = join(outputDirectory, file.path);

            await mkdir(dirname(runtimePath), { recursive: true });
            await writeFile(runtimePath, "export type DamlDate = { readonly daysSinceEpoch: number };\n", "utf8");
            await mkdir(dirname(typePath), { recursive: true });
            await writeFile(typePath, file.contents, "utf8");

            execFileSync(
                process.execPath,
                [
                    "./node_modules/typescript/bin/tsc",
                    "--noEmit",
                    "--module",
                    "NodeNext",
                    "--moduleResolution",
                    "NodeNext",
                    typePath,
                ],
                { cwd: process.cwd(), stdio: "inherit" },
            );
        } finally {
            await rm(outputDirectory, { recursive: true, force: true });
        }
    });

    it("does not collect imports through opaque ContractId targets", () => {
        const file = new NamedTypeEmitter().emitNamedTypeFiles([{
            identity: new TypeConReference({
                packageId: "sample-hash",
                moduleName: "Main",
                name: "Settlement",
            }),
            kind: "record",
            fields: [{
                damlLabel: "holding",
                propertyName: "holding",
                type: { kind: "contractId" },
            }],
        }])[0];

        expect(file?.contents).toContain("readonly holding: string;");
        expect(file?.contents).not.toContain("import type");
    });

    it("emits generic record and variant declarations with applied named references", () => {
        const reference = (name: string) => new TypeConReference({
            packageId: "sample-hash",
            moduleName: "Main",
            name,
        });

        const typeVariable = {
            kind: "typeVariable" as const,
            name: "T",
            internedStringIndex: 0,
        };

        const file = new NamedTypeEmitter().emitNamedTypeFiles([
            {
                identity: reference("Box"),
                kind: "record",
                typeParameters: [{ name: "T", internedStringIndex: 0, kind: { kind: "star" } }],
                fields: [{ damlLabel: "value", propertyName: "value", type: typeVariable }],
            },
            {
                identity: reference("Result"),
                kind: "variant",
                typeParameters: [{ name: "T", internedStringIndex: 0, kind: { kind: "star" } }],
                constructors: [{ constructor: "Success", payload: typeVariable }],
            },
            {
                identity: reference("Holder"),
                kind: "record",
                typeParameters: [],
                fields: [{
                    damlLabel: "boxed-result",
                    propertyName: "boxedResult",
                    type: {
                        kind: "namedReference",
                        identity: reference("Box"),
                        typeArguments: [{
                            kind: "namedReference",
                            identity: reference("Result"),
                            typeArguments: [{ kind: "primitive", builtinType: DamlLfBuiltinType.text }],
                        }],
                    },
                }, {
                    damlLabel: "boxed-date",
                    propertyName: "boxedDate",
                    type: {
                        kind: "namedReference",
                        identity: reference("Box"),
                        typeArguments: [{ kind: "primitive", builtinType: DamlLfBuiltinType.date }],
                    },
                }],
            },
        ])[0];

        expect(file.contents).toContain('import type { DamlDate } from "../../../support/runtime.js";');
        expect(file.contents).toContain("export interface Box<T> {");
        expect(file.contents).toContain("readonly value: T;");
        expect(file.contents).toContain("export type Result<T> =");
        expect(file.contents).toContain('readonly value: T; };');
        expect(file.contents).toContain("readonly boxedResult: Box<Result<string>>;");
        expect(file.contents).toContain("readonly boxedDate: Box<DamlDate>;");
    });

    it("renames generic parameters that collide with imported and runtime type symbols", () => {
        const reference = (name: string, moduleName = "Main") => new TypeConReference({
            packageId: "sample-hash",
            moduleName,
            name,
        });

        const file = new NamedTypeEmitter().emitNamedTypeFiles([
            {
                identity: reference("Box"),
                kind: "record",
                typeParameters: [
                    { name: "DamlDate", internedStringIndex: 0, kind: { kind: "star" } },
                    { name: "Amount", internedStringIndex: 1, kind: { kind: "star" } },
                ],
                fields: [
                    {
                        damlLabel: "date-value",
                        propertyName: "dateValue",
                        type: { kind: "typeVariable", name: "DamlDate", internedStringIndex: 0 },
                    },
                    {
                        damlLabel: "amount-value",
                        propertyName: "amountValue",
                        type: { kind: "typeVariable", name: "Amount", internedStringIndex: 1 },
                    },
                    {
                        damlLabel: "date",
                        propertyName: "date",
                        type: { kind: "primitive", builtinType: DamlLfBuiltinType.date },
                    },
                    {
                        damlLabel: "external-amount",
                        propertyName: "externalAmount",
                        type: { kind: "namedReference", identity: reference("Amount", "Other"), typeArguments: [] },
                    },
                ],
            },
            {
                identity: reference("Amount", "Other"),
                kind: "record",
                typeParameters: [],
                fields: [],
            },
        ])[0];

        expect(file.contents).toContain('import type { Amount } from "../other/types.js";');
        expect(file.contents).toContain("export interface Box<DamlDateType, AmountType> {");
        expect(file.contents).toContain("readonly dateValue: DamlDateType;");
        expect(file.contents).toContain("readonly amountValue: AmountType;");
        expect(file.contents).toContain("readonly date: DamlDate;");
        expect(file.contents).toContain("readonly externalAmount: Amount;");
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
