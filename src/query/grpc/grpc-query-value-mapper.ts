import { ValidationError } from "../../core/errors/validation-error.js";
import { immutableQueryValue } from "../canonical/query-dataset.js";
import type { Value } from "../../transports/grpc/generated/canton/com/daml/ledger/api/v2/value.js";

const MIN_DATE_EPOCH_DAY = -719_162;

const MAX_DATE_EPOCH_DAY = 2_932_896;

const INT64 = /^-?(?:0|[1-9]\d*)$/;

/** Maps a verbose Ledger API value to the JSON convention used by PQS predicates and rows. */
export function mapGrpcQueryValue(value: Value): unknown {
    if (value === undefined || value.sum === undefined) {
        throw new ValidationError("gRPC query value is missing its sum");
    }

    const mapped = mapValue(value);

    return immutableQueryValue(mapped);
}

function mapValue(value: Value): unknown {
    switch (value.sum.oneofKind) {
        case "unit": return {};
        case "bool": return value.sum.bool;
        case "int64": return int64(value.sum.int64, "int64");
        case "date": return date(value.sum.date);
        case "timestamp": return timestamp(value.sum.timestamp);
        case "numeric": return numeric(value.sum.numeric);
        case "party": return value.sum.party;
        case "text": return value.sum.text;
        case "contractId": return value.sum.contractId;
        case "optional": return value.sum.optional.value === undefined ? null : mapValue(value.sum.optional.value);
        case "list": return value.sum.list.elements.map(mapValue);
        case "textMap": return mapTextMap(value.sum.textMap.entries);
        case "genMap": return mapGenMap(value.sum.genMap.entries);
        case "record": return mapRecord(value.sum.record.fields);
        case "variant": {
            if (value.sum.variant.constructor.length === 0 || value.sum.variant.value === undefined) {
                throw new ValidationError("gRPC query variant is incomplete");
            }

            return { tag: value.sum.variant.constructor, value: mapValue(value.sum.variant.value) };
        }
        case "enum": {
            if (value.sum.enum.constructor.length === 0) {
                throw new ValidationError("gRPC query enum constructor is missing");
            }

            return value.sum.enum.constructor;
        }
        case undefined: throw new ValidationError("gRPC query value has no active sum");
    }
}

function mapRecord(fields: readonly { readonly label: string; readonly value?: Value }[]): Record<string, unknown> {
    const output: Record<string, unknown> = Object.create(null) as Record<string, unknown>;

    for (const [index, field] of fields.entries()) {
        if (field.label.length === 0) {
            throw new ValidationError(`gRPC query record field ${index} is unlabeled; verbose values are required`);
        } else if (Object.hasOwn(output, field.label)) {
            throw new ValidationError(`gRPC query record has duplicate label ${field.label}`);
        } else if (field.value === undefined) {
            throw new ValidationError(`gRPC query record field ${field.label} has no value`);
        }

        defineData(output, field.label, mapValue(field.value));
    }

    return output;
}

function mapTextMap(entries: readonly { readonly key: string; readonly value?: Value }[]): Record<string, unknown> {
    const output: Record<string, unknown> = Object.create(null) as Record<string, unknown>;

    for (const [index, entry] of entries.entries()) {
        if (Object.hasOwn(output, entry.key)) {
            throw new ValidationError(`gRPC query text-map has duplicate key ${entry.key}`);
        } else if (entry.value === undefined) {
            throw new ValidationError(`gRPC query text-map entry ${index} has no value`);
        }

        defineData(output, entry.key, mapValue(entry.value));
    }

    return output;
}

function mapGenMap(entries: readonly { readonly key?: Value; readonly value?: Value }[]): readonly (readonly [unknown, unknown])[] {
    const seenKeys = new Set<string>();

    return entries.map((entry, index) => {
        if (entry.key === undefined || entry.value === undefined) {
            throw new ValidationError(`gRPC query gen-map entry ${index} is incomplete`);
        }

        const key = mapValue(entry.key);

        const canonicalKey = canonicalJsonKey(key);

        if (seenKeys.has(canonicalKey)) {
            throw new ValidationError(`gRPC query gen-map has duplicate key at entry ${index}`);
        }

        seenKeys.add(canonicalKey);

        return [key, mapValue(entry.value)] as const;
    });
}

function canonicalJsonKey(value: unknown): string {
    if (value === null) {
        return "null";
    } else if (typeof value === "boolean") {
        return `boolean:${value}`;
    } else if (typeof value === "string") {
        return `string:${JSON.stringify(value)}`;
    } else if (typeof value === "number") {
        return Number.isFinite(value) ? `number:${value}` : invalidGenMapKey();
    } else if (Array.isArray(value)) {
        return `array:[${value.map(canonicalJsonKey).join(",")}]`;
    } else if (typeof value !== "object") {
        return invalidGenMapKey();
    }

    const record = value as Record<string, unknown>;

    const keys = Object.keys(record).sort();

    if (keys.length !== Object.keys(record).length) {
        return invalidGenMapKey();
    }

    return `object:{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJsonKey(record[key])}`).join(",")}}`;
}

function invalidGenMapKey(): never {
    throw new ValidationError("gRPC query gen-map key cannot be represented as ledger JSON");
}

function defineData(target: Record<string, unknown>, key: string, value: unknown): void {
    Object.defineProperty(target, key, { value, enumerable: true, configurable: false, writable: false });
}

function int64(value: string, name: string): string {
    if (!INT64.test(value)) {
        throw new ValidationError(`gRPC query ${name} is not an integer`);
    } else if (BigInt(value) < -9_223_372_036_854_775_808n || BigInt(value) > 9_223_372_036_854_775_807n) {
        throw new ValidationError(`gRPC query ${name} is outside the int64 range`);
    }

    return value;
}

function timestamp(value: string): string {
    int64(value, "timestamp");

    if (BigInt(value) < -62_135_596_800_000_000n || BigInt(value) > 253_402_300_799_999_999n) {
        throw new ValidationError("gRPC query timestamp is outside the Ledger API range");
    }

    return value;
}

function date(value: number): number {
    if (!Number.isInteger(value) || value < MIN_DATE_EPOCH_DAY || value > MAX_DATE_EPOCH_DAY) {
        throw new ValidationError("gRPC query date is outside the Ledger API range");
    }

    return value;
}

function numeric(value: string): string {
    if (!/^[+-]?\d{1,38}(?:\.\d{0,37})?$/.test(value)) {
        throw new ValidationError("gRPC query numeric is invalid");
    }

    const unsigned = value.replace(/^[+-]/, "");

    const [whole, fractional = ""] = unsigned.split(".");

    const significant = `${whole}${fractional}`.replace(/^0+/, "").length;

    if (fractional.length > 37 || significant > 38) {
        throw new ValidationError("gRPC query numeric exceeds DAML Numeric precision");
    }

    return value;
}
