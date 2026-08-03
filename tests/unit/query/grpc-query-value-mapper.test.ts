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
            unit: null, bool: true, int: "9007199254740993", numeric: "12.30", date: 20,
            timestamp: "1700000000123456", party: "Alice", text: "hello", contract: "#1",
            none: null, some: ["x"], textMap: { a: false }, genMap: [{ key: "a", value: "1" }],
            variant: { constructor: "Some", value: "nested" }, enum: "Open",
        });
    });

    it("rejects malformed verbose values rather than silently changing their JSON meaning", () => {
        expect(() => mapGrpcQueryValue(value({ oneofKind: "record", record: { fields: [{ label: "", value: value({ oneofKind: "text", text: "x" }) }] } }))).toThrow(ValidationError);
        expect(() => mapGrpcQueryValue(value({ oneofKind: "record", record: { fields: [{ label: "x", value: value({ oneofKind: "text", text: "a" }) }, { label: "x", value: value({ oneofKind: "text", text: "b" }) }] } }))).toThrow(/duplicate/i);
        expect(() => mapGrpcQueryValue(value({ oneofKind: "textMap", textMap: { entries: [{ key: "x", value: value({ oneofKind: "text", text: "a" }) }, { key: "x", value: value({ oneofKind: "text", text: "b" }) }] } }))).toThrow(/duplicate/i);
        expect(() => mapGrpcQueryValue(value({ oneofKind: "timestamp", timestamp: "253402300800000000" }))).toThrow(ValidationError);
        expect(() => mapGrpcQueryValue(value({ oneofKind: undefined }))).toThrow(ValidationError);
    });

    it("returns a detached immutable JSON value", () => {
        const mapped = mapGrpcQueryValue(value({ oneofKind: "record", record: { fields: [{ label: "x", value: value({ oneofKind: "list", list: { elements: [value({ oneofKind: "text", text: "a" })] } }) }] } })) as { x: string[] };

        expect(Object.isFrozen(mapped)).toBe(true);
        expect(Object.isFrozen(mapped.x)).toBe(true);
        expect(() => mapped.x.push("changed")).toThrow();
    });
});
