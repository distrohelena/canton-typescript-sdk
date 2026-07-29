import { describe, expect, it } from "vitest";
import {
    DamlDate,
    DamlEnum,
    DamlGenMap,
    DamlMaterializationError,
    DamlNumeric,
    DamlParty,
    DamlRecord,
    DamlTemplate,
    DamlTextMap,
    DamlTimestamp,
    DamlTypeDescriptor,
    DamlTypeDescriptorRegistry,
    DamlUnit,
    DamlVariant,
    decodeDamlValue,
} from "../../../src/daml-interface/index.js";
import { Value } from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/value.js";

const emptyRegistry: DamlTypeDescriptorRegistry = {
    resolve: () => undefined,
};

const descriptors = {
    unit: { kind: "primitive", primitive: "unit" },
    bool: { kind: "primitive", primitive: "bool" },
    int64: { kind: "primitive", primitive: "int64" },
    date: { kind: "primitive", primitive: "date" },
    timestamp: { kind: "primitive", primitive: "timestamp" },
    numeric: { kind: "primitive", primitive: "numeric" },
    party: { kind: "primitive", primitive: "party" },
    text: { kind: "primitive", primitive: "text" },
} as const satisfies Record<string, DamlTypeDescriptor>;

function protobuf(value: Value): { readonly kind: "protobuf"; readonly value: Value } {
    return { kind: "protobuf", value };
}

function json(value: unknown): { readonly kind: "json"; readonly value: unknown } {
    return { kind: "json", value };
}

describe("DamlTemplate", () => {
    it("keeps the contract ID private and returns it through get", () => {
        const template = new DamlTemplate("cid-1");

        expect(template.get()).toBe("cid-1");
        expect(Object.keys(template)).toEqual([]);
        expect("contractId" in template).toBe(false);
    });
});

describe("decodeDamlValue primitive representations", () => {
    it("converts protobuf primitive values to SDK values", () => {
        expect(decodeDamlValue(protobuf(Value.create({ sum: { oneofKind: "int64", int64: "42" } })), descriptors.int64, emptyRegistry, "Iou.amount")).toBe(42n);
        expect(decodeDamlValue(protobuf(Value.create({ sum: { oneofKind: "numeric", numeric: "12.30" } })), descriptors.numeric, emptyRegistry, "Iou.amount")).toEqual(new DamlNumeric("12.30"));
        expect(decodeDamlValue(protobuf(Value.create({ sum: { oneofKind: "party", party: "Alice" } })), descriptors.party, emptyRegistry, "Iou.owner")).toEqual(new DamlParty("Alice"));
        expect(decodeDamlValue(protobuf(Value.create({ sum: { oneofKind: "date", date: 20 } })), descriptors.date, emptyRegistry, "Iou.date")).toEqual(new DamlDate(20));
        expect(decodeDamlValue(protobuf(Value.create({ sum: { oneofKind: "timestamp", timestamp: "1000000" } })), descriptors.timestamp, emptyRegistry, "Iou.time")).toEqual(new DamlTimestamp("1000000"));
        expect(decodeDamlValue(protobuf(Value.create({ sum: { oneofKind: "unit", unit: {} } })), descriptors.unit, emptyRegistry, "Iou.unit")).toBeInstanceOf(DamlUnit);
    });

    it("converts equivalent JSON/PQS primitive values to SDK values", () => {
        expect(decodeDamlValue(json("42"), descriptors.int64, emptyRegistry, "Iou.amount")).toBe(42n);
        expect(decodeDamlValue(json("12.30"), descriptors.numeric, emptyRegistry, "Iou.amount")).toEqual(new DamlNumeric("12.30"));
        expect(decodeDamlValue(json("Alice"), descriptors.party, emptyRegistry, "Iou.owner")).toEqual(new DamlParty("Alice"));
        expect(decodeDamlValue(json(20), descriptors.date, emptyRegistry, "Iou.date")).toEqual(new DamlDate(20));
        expect(decodeDamlValue(json("1000000"), descriptors.timestamp, emptyRegistry, "Iou.time")).toEqual(new DamlTimestamp("1000000"));
        expect(decodeDamlValue(json({}), descriptors.unit, emptyRegistry, "Iou.unit")).toBeInstanceOf(DamlUnit);
    });
});

describe("decodeDamlValue nested values and validation", () => {
    const tradeDescriptor = {
        kind: "record",
        fields: [
            { damlLabel: "amount", propertyName: "amount", type: descriptors.numeric },
            { damlLabel: "owner", propertyName: "owner", type: descriptors.party },
        ],
    } as const satisfies DamlTypeDescriptor;

    it("converts optionals, lists, text maps, and generic maps", () => {
        const optional = { kind: "optional", element: descriptors.text } as const satisfies DamlTypeDescriptor;

        const list = { kind: "list", element: descriptors.int64 } as const satisfies DamlTypeDescriptor;

        const textMap = { kind: "textMap", value: descriptors.party } as const satisfies DamlTypeDescriptor;

        const genMap = { kind: "genMap", key: descriptors.text, value: descriptors.int64 } as const satisfies DamlTypeDescriptor;

        expect(decodeDamlValue(json(null), optional, emptyRegistry, "Iou.memo")).toBeUndefined();
        expect(decodeDamlValue(json("memo"), optional, emptyRegistry, "Iou.memo")).toBe("memo");
        expect(decodeDamlValue(json(["1", "2"]), list, emptyRegistry, "Iou.ids")).toEqual([1n, 2n]);
        expect(decodeDamlValue(json({ Alice: "Alice" }), textMap, emptyRegistry, "Iou.owners")).toEqual(new DamlTextMap([["Alice", new DamlParty("Alice")]]));
        expect(decodeDamlValue(json([["one", "1"]]), genMap, emptyRegistry, "Iou.entries")).toEqual(new DamlGenMap([["one", 1n]]));
    });

    it("converts labelled and positional records", () => {
        expect(decodeDamlValue(json({ amount: "12.30", owner: "Alice" }), tradeDescriptor, emptyRegistry, "Trade")).toEqual(new DamlRecord({ amount: new DamlNumeric("12.30"), owner: new DamlParty("Alice") }));
        expect(decodeDamlValue(json(["12.30", "Alice"]), tradeDescriptor, emptyRegistry, "Trade")).toEqual(new DamlRecord({ amount: new DamlNumeric("12.30"), owner: new DamlParty("Alice") }));
    });

    it("converts variants, enums, and contract IDs", () => {
        const variant = { kind: "variant", constructors: [{ constructor: "Owner", payload: descriptors.party }] } as const satisfies DamlTypeDescriptor;

        const enumeration = { kind: "enum", constructors: ["Open", "Closed"] } as const satisfies DamlTypeDescriptor;

        const contractId = { kind: "contractId", contract: tradeDescriptor } as const satisfies DamlTypeDescriptor;

        expect(decodeDamlValue(json({ tag: "Owner", value: "Alice" }), variant, emptyRegistry, "Trade.role")).toEqual(new DamlVariant("Owner", new DamlParty("Alice")));
        expect(decodeDamlValue(json("Open"), enumeration, emptyRegistry, "Trade.status")).toEqual(new DamlEnum("Open"));
        expect(decodeDamlValue(json("#contract"), contractId, emptyRegistry, "Trade.id")).toBe("#contract");
    });

    it("resolves named references lazily and supports self-recursive records", () => {
        const nodeIdentity = { packageId: "pkg", moduleName: "Main", entityName: "Node" } as const;

        const registry: DamlTypeDescriptorRegistry = {
            resolve: (identity) => identity.packageId === "pkg" && identity.moduleName === "Main" && identity.entityName === "Node"
                ? () => ({
                    kind: "record",
                    fields: [
                        { damlLabel: "name", propertyName: "name", type: descriptors.text },
                        { damlLabel: "next", propertyName: "next", type: { kind: "optional", element: { kind: "namedReference", identity: nodeIdentity } } },
                    ],
                })
                : undefined,
        };

        const node = decodeDamlValue(json({ name: "root", next: { name: "leaf", next: null } }), { kind: "namedReference", identity: nodeIdentity }, registry, "Node");

        expect(node).toEqual(new DamlRecord({ name: "root", next: new DamlRecord({ name: "leaf", next: undefined }) }));
    });

    it("rejects absent values, type mismatches, invalid scalar content, and malformed JSON shapes with the descriptor path", () => {
        expect(() => decodeDamlValue(protobuf(Value.create({ sum: { oneofKind: undefined } })), descriptors.text, emptyRegistry, "Iou.name")).toThrow(DamlMaterializationError);
        expect(() => decodeDamlValue(protobuf(Value.create({ sum: { oneofKind: "bool", bool: true } })), descriptors.text, emptyRegistry, "Iou.name")).toThrow(/Iou\.name/);
        expect(() => decodeDamlValue(json(1), descriptors.text, emptyRegistry, "Iou.name")).toThrow(/Iou\.name/);
        expect(() => decodeDamlValue(json("invalid"), descriptors.numeric, emptyRegistry, "Iou.amount")).toThrow(/Iou\.amount/);
        expect(() => decodeDamlValue(json(""), descriptors.party, emptyRegistry, "Iou.owner")).toThrow(/Iou\.owner/);
        expect(() => decodeDamlValue(json({ amount: "1" }), tradeDescriptor, emptyRegistry, "Trade")).toThrow(/Trade\.owner/);
        expect(() => decodeDamlValue(json(["1"]), tradeDescriptor, emptyRegistry, "Trade")).toThrow(/Trade/);
        expect(() => decodeDamlValue(json({ tag: "Other", value: "Alice" }), { kind: "variant", constructors: [{ constructor: "Owner", payload: descriptors.party }] }, emptyRegistry, "Trade.role")).toThrow(/Trade\.role/);
        expect(() => decodeDamlValue(json("Other"), { kind: "enum", constructors: ["Open"] }, emptyRegistry, "Trade.status")).toThrow(/Trade\.status/);
    });
});
