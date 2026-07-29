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
    DamlValueConverter,
    DamlVariant,
} from "../../../src/daml-interface/index.js";
import { Value } from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/value.js";

const emptyRegistry: DamlTypeDescriptorRegistry = {
    resolve: () => undefined,
};

const decodeDamlValue = DamlValueConverter.decode;

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
    it("exposes the contract ID through a read-only property", () => {
        const template = new DamlTemplate("cid-1");

        expect(template.contractId).toBe("cid-1");
        expect(Object.keys(template)).toEqual([]);
        expect("get" in template).toBe(false);
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

    it("enforces DAML Numeric scale and ledger precision for protobuf and JSON values", () => {
        const scaleTwo = { kind: "primitive", primitive: "numeric", numericScale: 2 } as const satisfies DamlTypeDescriptor;

        const overPrecision = "123456789012345678901234567890123456789";

        expect(decodeDamlValue(protobuf(Value.create({ sum: { oneofKind: "numeric", numeric: "12.30" } })), scaleTwo, emptyRegistry, "Iou.amount")).toEqual(new DamlNumeric("12.30"));
        expect(decodeDamlValue(json("12.30"), scaleTwo, emptyRegistry, "Iou.amount")).toEqual(new DamlNumeric("12.30"));
        expect(() => decodeDamlValue(protobuf(Value.create({ sum: { oneofKind: "numeric", numeric: "12.300" } })), scaleTwo, emptyRegistry, "Iou.amount")).toThrow(/Iou\.amount/);
        expect(() => decodeDamlValue(json("12.300"), scaleTwo, emptyRegistry, "Iou.amount")).toThrow(/Iou\.amount/);
        expect(() => decodeDamlValue(protobuf(Value.create({ sum: { oneofKind: "numeric", numeric: overPrecision } })), descriptors.numeric, emptyRegistry, "Iou.amount")).toThrow(/Iou\.amount/);
        expect(() => decodeDamlValue(json(overPrecision), descriptors.numeric, emptyRegistry, "Iou.amount")).toThrow(/Iou\.amount/);
    });

    it("normalizes Ledger Numeric leading plus signs for protobuf and JSON values", () => {
        expect(decodeDamlValue(protobuf(Value.create({ sum: { oneofKind: "numeric", numeric: "+12.30" } })), descriptors.numeric, emptyRegistry, "Iou.amount")).toEqual(new DamlNumeric("12.30"));
        expect(decodeDamlValue(json("+12.30"), descriptors.numeric, emptyRegistry, "Iou.amount")).toEqual(new DamlNumeric("12.30"));
        expect(() => decodeDamlValue(json("+-12.30"), descriptors.numeric, emptyRegistry, "Iou.amount")).toThrow(/Iou\.amount/);
    });

    it("canonicalizes documented Ledger Numeric leading zeros and trailing dots for protobuf and JSON values", () => {
        expect(decodeDamlValue(protobuf(Value.create({ sum: { oneofKind: "numeric", numeric: "0001" } })), descriptors.numeric, emptyRegistry, "Iou.amount")).toEqual(new DamlNumeric("1"));
        expect(decodeDamlValue(json("0001"), descriptors.numeric, emptyRegistry, "Iou.amount")).toEqual(new DamlNumeric("1"));
        expect(decodeDamlValue(protobuf(Value.create({ sum: { oneofKind: "numeric", numeric: "+0001" } })), descriptors.numeric, emptyRegistry, "Iou.amount")).toEqual(new DamlNumeric("1"));
        expect(decodeDamlValue(json("+0001"), descriptors.numeric, emptyRegistry, "Iou.amount")).toEqual(new DamlNumeric("1"));
        expect(decodeDamlValue(protobuf(Value.create({ sum: { oneofKind: "numeric", numeric: "1." } })), descriptors.numeric, emptyRegistry, "Iou.amount")).toEqual(new DamlNumeric("1"));
        expect(decodeDamlValue(json("1."), descriptors.numeric, emptyRegistry, "Iou.amount")).toEqual(new DamlNumeric("1"));
    });

    it("enforces signed Int64 bounds for protobuf and JSON values", () => {
        expect(decodeDamlValue(protobuf(Value.create({ sum: { oneofKind: "int64", int64: "-9223372036854775808" } })), descriptors.int64, emptyRegistry, "Iou.amount")).toBe(-9223372036854775808n);
        expect(decodeDamlValue(json("9223372036854775807"), descriptors.int64, emptyRegistry, "Iou.amount")).toBe(9223372036854775807n);
        expect(() => decodeDamlValue(protobuf(Value.create({ sum: { oneofKind: "int64", int64: "9223372036854775808" } })), descriptors.int64, emptyRegistry, "Iou.amount")).toThrow(/Iou\.amount/);
        expect(() => decodeDamlValue(json("-9223372036854775809"), descriptors.int64, emptyRegistry, "Iou.amount")).toThrow(/Iou\.amount/);
    });

    it("enforces ledger Date and Timestamp bounds for protobuf and JSON values", () => {
        expect(decodeDamlValue(protobuf(Value.create({ sum: { oneofKind: "date", date: -719162 } })), descriptors.date, emptyRegistry, "Iou.date")).toEqual(new DamlDate(-719162));
        expect(decodeDamlValue(json(2932896), descriptors.date, emptyRegistry, "Iou.date")).toEqual(new DamlDate(2932896));
        expect(decodeDamlValue(protobuf(Value.create({ sum: { oneofKind: "timestamp", timestamp: "-62135596800000000" } })), descriptors.timestamp, emptyRegistry, "Iou.time")).toEqual(new DamlTimestamp("-62135596800000000"));
        expect(decodeDamlValue(json("253402300799999999"), descriptors.timestamp, emptyRegistry, "Iou.time")).toEqual(new DamlTimestamp("253402300799999999"));
        expect(() => decodeDamlValue(protobuf(Value.create({ sum: { oneofKind: "date", date: -719163 } })), descriptors.date, emptyRegistry, "Iou.date")).toThrow(/Iou\.date/);
        expect(() => decodeDamlValue(json(2932897), descriptors.date, emptyRegistry, "Iou.date")).toThrow(/Iou\.date/);
        expect(() => decodeDamlValue(protobuf(Value.create({ sum: { oneofKind: "timestamp", timestamp: "-62135596800000001" } })), descriptors.timestamp, emptyRegistry, "Iou.time")).toThrow(/Iou\.time/);
        expect(() => decodeDamlValue(json("253402300800000000"), descriptors.timestamp, emptyRegistry, "Iou.time")).toThrow(/Iou\.time/);
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

        const contractId = { kind: "contractId" } as const satisfies DamlTypeDescriptor;

        const legacyContractId = { kind: "contractId", contract: tradeDescriptor } as const satisfies DamlTypeDescriptor;

        expect(decodeDamlValue(json({ tag: "Owner", value: "Alice" }), variant, emptyRegistry, "Trade.role")).toEqual(new DamlVariant("Owner", new DamlParty("Alice")));
        expect(decodeDamlValue(json("Open"), enumeration, emptyRegistry, "Trade.status")).toEqual(new DamlEnum("Open"));
        expect(decodeDamlValue(json("#contract"), contractId, emptyRegistry, "Trade.id")).toBe("#contract");
        expect(decodeDamlValue(json("#legacy-contract"), legacyContractId, emptyRegistry, "Trade.id")).toBe("#legacy-contract");
    });

    it("converts protobuf optionals, maps, labelled and positional records, variants, enums, and contract IDs", () => {
        const optional = { kind: "optional", element: descriptors.text } as const satisfies DamlTypeDescriptor;

        const list = { kind: "list", element: descriptors.int64 } as const satisfies DamlTypeDescriptor;

        const textMap = { kind: "textMap", value: descriptors.party } as const satisfies DamlTypeDescriptor;

        const genMap = { kind: "genMap", key: descriptors.text, value: descriptors.int64 } as const satisfies DamlTypeDescriptor;

        const variant = { kind: "variant", constructors: [{ constructor: "Owner", payload: descriptors.party }] } as const satisfies DamlTypeDescriptor;

        const enumeration = { kind: "enum", constructors: ["Open"] } as const satisfies DamlTypeDescriptor;

        const contractId = { kind: "contractId" } as const satisfies DamlTypeDescriptor;

        expect(decodeDamlValue(protobuf(Value.create({ sum: { oneofKind: "optional", optional: { value: Value.create({ sum: { oneofKind: "text", text: "memo" } }) } } })), optional, emptyRegistry, "Iou.memo")).toBe("memo");
        expect(decodeDamlValue(protobuf(Value.create({ sum: { oneofKind: "optional", optional: {} } })), optional, emptyRegistry, "Iou.memo")).toBeUndefined();
        expect(decodeDamlValue(protobuf(Value.create({ sum: { oneofKind: "list", list: { elements: [Value.create({ sum: { oneofKind: "int64", int64: "1" } }), Value.create({ sum: { oneofKind: "int64", int64: "2" } })] } } })), list, emptyRegistry, "Iou.ids")).toEqual([1n, 2n]);
        expect(decodeDamlValue(protobuf(Value.create({ sum: { oneofKind: "textMap", textMap: { entries: [{ key: "Alice", value: Value.create({ sum: { oneofKind: "party", party: "Alice" } }) }] } } })), textMap, emptyRegistry, "Iou.owners")).toEqual(new DamlTextMap([["Alice", new DamlParty("Alice")]]));
        expect(decodeDamlValue(protobuf(Value.create({ sum: { oneofKind: "genMap", genMap: { entries: [{ key: Value.create({ sum: { oneofKind: "text", text: "one" } }), value: Value.create({ sum: { oneofKind: "int64", int64: "1" } }) }] } } })), genMap, emptyRegistry, "Iou.entries")).toEqual(new DamlGenMap([["one", 1n]]));
        expect(decodeDamlValue(protobuf(Value.create({ sum: { oneofKind: "record", record: { fields: [{ label: "amount", value: Value.create({ sum: { oneofKind: "numeric", numeric: "12.30" } }) }, { label: "owner", value: Value.create({ sum: { oneofKind: "party", party: "Alice" } }) }] } } })), tradeDescriptor, emptyRegistry, "Trade")).toEqual(new DamlRecord({ amount: new DamlNumeric("12.30"), owner: new DamlParty("Alice") }));
        expect(decodeDamlValue(protobuf(Value.create({ sum: { oneofKind: "record", record: { fields: [{ label: "", value: Value.create({ sum: { oneofKind: "numeric", numeric: "12.30" } }) }, { label: "", value: Value.create({ sum: { oneofKind: "party", party: "Alice" } }) }] } } })), tradeDescriptor, emptyRegistry, "Trade")).toEqual(new DamlRecord({ amount: new DamlNumeric("12.30"), owner: new DamlParty("Alice") }));
        expect(decodeDamlValue(protobuf(Value.create({ sum: { oneofKind: "variant", variant: { constructor: "Owner", value: Value.create({ sum: { oneofKind: "party", party: "Alice" } }) } } })), variant, emptyRegistry, "Trade.role")).toEqual(new DamlVariant("Owner", new DamlParty("Alice")));
        expect(decodeDamlValue(protobuf(Value.create({ sum: { oneofKind: "enum", enum: { constructor: "Open" } } })), enumeration, emptyRegistry, "Trade.status")).toEqual(new DamlEnum("Open"));
        expect(decodeDamlValue(protobuf(Value.create({ sum: { oneofKind: "contractId", contractId: "#contract" } })), contractId, emptyRegistry, "Trade.id")).toBe("#contract");
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
        expect(() => decodeDamlValue(protobuf(Value.create({ sum: { oneofKind: "timestamp", timestamp: "not-microseconds" } })), descriptors.timestamp, emptyRegistry, "Iou.time")).toThrow(/Iou\.time/);
        expect(() => decodeDamlValue(json(1), descriptors.text, emptyRegistry, "Iou.name")).toThrow(/Iou\.name/);
        expect(() => decodeDamlValue(json("invalid"), descriptors.numeric, emptyRegistry, "Iou.amount")).toThrow(/Iou\.amount/);
        expect(() => decodeDamlValue(json(""), descriptors.party, emptyRegistry, "Iou.owner")).toThrow(/Iou\.owner/);
        expect(() => decodeDamlValue(json({ amount: "1" }), tradeDescriptor, emptyRegistry, "Trade")).toThrow(/Trade\.owner/);
        expect(() => decodeDamlValue(json(["1"]), tradeDescriptor, emptyRegistry, "Trade")).toThrow(/Trade/);
        expect(() => decodeDamlValue(json({ tag: "Other", value: "Alice" }), { kind: "variant", constructors: [{ constructor: "Owner", payload: descriptors.party }] }, emptyRegistry, "Trade.role")).toThrow(/Trade\.role/);
        expect(() => decodeDamlValue(json("Other"), { kind: "enum", constructors: ["Open"] }, emptyRegistry, "Trade.status")).toThrow(/Trade\.status/);
    });
});
