import { describe, expect, it } from "vitest";
import { ValidationError } from "../../../src/core/errors/validation-error.js";
import { mapGrpcQueryValue } from "../../../src/query/grpc/grpc-query-value-mapper.js";
import { Value } from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/value.js";

const value = (sum: Value["sum"]): Value => Value.create({ sum });

describe("mapGrpcQueryValue", () => {
    it("maps every ledger Value shape to the PQS-compatible JSON shape", () => {
        const input = value({ oneofKind: "record", record: { fields: [
            { label: "unit", value: value({ oneofKind: "unit", unit: {} }) },
            { label: "bool", value: value({ oneofKind: "bool", bool: true }) },
            { label: "int", value: value({ oneofKind: "int64", int64: "9007199254740993" }) },
            { label: "numeric", value: value({ oneofKind: "numeric", numeric: "12.30" }) },
            { label: "date", value: value({ oneofKind: "date", date: 20 }) },
            { label: "timestamp", value: value({ oneofKind: "timestamp", timestamp: "1700000000123456" }) },
            { label: "party", value: value({ oneofKind: "party", party: "Alice" }) },
            { label: "text", value: value({ oneofKind: "text", text: "hello" }) },
            { label: "contract", value: value({ oneofKind: "contractId", contractId: "#1" }) },
            { label: "none", value: value({ oneofKind: "optional", optional: {} }) },
            { label: "some", value: value({ oneofKind: "optional", optional: { value: value({ oneofKind: "list", list: { elements: [value({ oneofKind: "text", text: "x" })] } }) } }) },
            { label: "textMap", value: value({ oneofKind: "textMap", textMap: { entries: [{ key: "a", value: value({ oneofKind: "bool", bool: false }) }] } }) },
            { label: "genMap", value: value({ oneofKind: "genMap", genMap: { entries: [{ key: value({ oneofKind: "text", text: "a" }), value: value({ oneofKind: "int64", int64: "1" }) }] } }) },
            { label: "variant", value: value({ oneofKind: "variant", variant: { constructor: "Some", value: value({ oneofKind: "text", text: "nested" }) } }) },
            { label: "enum", value: value({ oneofKind: "enum", enum: { constructor: "Open" } }) },
        ] } });

        expect(mapGrpcQueryValue(input)).toEqual({
            unit: {}, bool: true, int: "9007199254740993", numeric: "12.30", date: 20,
            timestamp: "1700000000123456", party: "Alice", text: "hello", contract: "#1",
            none: null, some: ["x"], textMap: { a: false }, genMap: [["a", "1"]],
            variant: { tag: "Some", value: "nested" }, enum: "Open",
        });
    });

    it("rejects malformed verbose values rather than silently changing their JSON meaning", () => {
        expect(() => mapGrpcQueryValue(value({ oneofKind: "record", record: { fields: [{ label: "", value: value({ oneofKind: "text", text: "x" }) }] } }))).toThrow(ValidationError);
        expect(() => mapGrpcQueryValue(value({ oneofKind: "record", record: { fields: [{ label: "x", value: value({ oneofKind: "text", text: "a" }) }, { label: "x", value: value({ oneofKind: "text", text: "b" }) }] } }))).toThrow(/duplicate/i);
        expect(() => mapGrpcQueryValue(value({ oneofKind: "textMap", textMap: { entries: [{ key: "x", value: value({ oneofKind: "text", text: "a" }) }, { key: "x", value: value({ oneofKind: "text", text: "b" }) }] } }))).toThrow(/duplicate/i);
        expect(() => mapGrpcQueryValue(value({ oneofKind: "timestamp", timestamp: "253402300800000000" }))).toThrow(ValidationError);
        expect(() => mapGrpcQueryValue(value({ oneofKind: "numeric", numeric: "12345678901234567890123456789012345678.1" }))).toThrow(ValidationError);
        expect(() => mapGrpcQueryValue(value({ oneofKind: undefined }))).toThrow(ValidationError);
    });

    it("returns a detached immutable JSON value", () => {
        const mapped = mapGrpcQueryValue(value({ oneofKind: "record", record: { fields: [{ label: "x", value: value({ oneofKind: "list", list: { elements: [value({ oneofKind: "text", text: "a" })] } }) }] } })) as { x: string[] };

        expect(Object.isFrozen(mapped)).toBe(true);
        expect(Object.isFrozen(mapped.x)).toBe(true);
        expect(() => mapped.x.push("changed")).toThrow();
    });

    it("uses materializer-compatible nested envelopes and lossless generic map pairs", () => {
        const mapped = mapGrpcQueryValue(value({ oneofKind: "genMap", genMap: { entries: [
            { key: value({ oneofKind: "text", text: "1" }), value: value({ oneofKind: "variant", variant: { constructor: "Owner", value: value({ oneofKind: "unit", unit: {} }) } }) },
            { key: value({ oneofKind: "bool", bool: true }), value: value({ oneofKind: "optional", optional: {} }) },
        ] } }));

        expect(mapped).toEqual([["1", { tag: "Owner", value: {} }], [true, null]]);
    });

    it("rejects duplicate canonical generic-map keys while retaining distinct JSON types", () => {
        const text = value({ oneofKind: "text", text: "one" });

        const record = (fields: readonly { label: string; value: Value }[]) => value({ oneofKind: "record", record: { fields: [...fields] } });

        expect(() => mapGrpcQueryValue(value({ oneofKind: "genMap", genMap: { entries: [{ key: text, value: text }, { key: text, value: text }] } }))).toThrow(/duplicate/i);
        expect(() => mapGrpcQueryValue(value({ oneofKind: "genMap", genMap: { entries: [
            { key: record([{ label: "a", value: text }, { label: "b", value: text }]), value: text },
            { key: record([{ label: "b", value: text }, { label: "a", value: text }]), value: text },
        ] } }))).toThrow(/duplicate/i);
        expect(mapGrpcQueryValue(value({ oneofKind: "genMap", genMap: { entries: [{ key: value({ oneofKind: "text", text: "1" }), value: text }, { key: value({ oneofKind: "bool", bool: true }), value: text }] } }))).toHaveLength(2);
    });

    it("preserves special record and text-map keys as own data properties", () => {
        const mapped = mapGrpcQueryValue(value({ oneofKind: "record", record: { fields: [
            { label: "__proto__", value: value({ oneofKind: "text", text: "proto" }) },
            { label: "constructor", value: value({ oneofKind: "text", text: "ctor" }) },
            { label: "toString", value: value({ oneofKind: "text", text: "string" }) },
        ] } })) as Record<string, unknown>;

        expect(Object.keys(mapped)).toEqual(["__proto__", "constructor", "toString"]);
        expect(Object.hasOwn(mapped, "__proto__")).toBe(true);
        expect(mapped).toMatchObject({ __proto__: "proto", constructor: "ctor", toString: "string" });

        const textMap = mapGrpcQueryValue(value({ oneofKind: "textMap", textMap: { entries: [{ key: "__proto__", value: value({ oneofKind: "text", text: "safe" }) }] } })) as Record<string, unknown>;

        expect(Object.hasOwn(textMap, "__proto__")).toBe(true);
        expect(textMap["__proto__"]).toBe("safe");
    });

    it.each([
        ["12345678901234567890123456789012345678", true],
        ["0.1234567890123456789012345678901234567", true],
        ["123456789012345678901234567890123456789", false],
        ["1.12345678901234567890123456789012345678", false],
        ["1..0", false],
    ])("validates DAML Numeric precision for %s", (numeric, valid) => {
        const input = value({ oneofKind: "numeric", numeric });

        if (valid) {
            expect(mapGrpcQueryValue(input)).toBe(numeric);
        } else {
            expect(() => mapGrpcQueryValue(input)).toThrow(ValidationError);
        }
    });
});
