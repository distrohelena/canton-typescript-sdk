import { ValidationError } from "../../core/errors/validation-error.js";
import { immutableQueryValue } from "../canonical/query-dataset.js";
import type { Value } from "../../transports/grpc/generated/canton/com/daml/ledger/api/v2/value.js";

const MIN_DATE_EPOCH_DAY = -719_162;

const MAX_DATE_EPOCH_DAY = 2_932_896;

const INT64 = /^-?(?:0|[1-9]\d*)$/;

/** Maximum generated Value nesting accepted before recursive mapping becomes unsafe. */
export const MAX_GRPC_QUERY_VALUE_DEPTH = 256;

/** Maps a verbose Ledger API value to the JSON convention used by PQS predicates and rows. */
export function mapGrpcQueryValue(value: Value): unknown {
    if (value === undefined || value.sum === undefined) {
        throw new ValidationError("gRPC query value is missing its sum");
    }

    const mapped = mapValue(value, 0);

    return immutableQueryValue(mapped);
}

function mapValue(value: Value, depth: number): unknown {
    if (depth > MAX_GRPC_QUERY_VALUE_DEPTH) {
        throw new ValidationError(`gRPC query value exceeds maximum nesting depth ${MAX_GRPC_QUERY_VALUE_DEPTH}`);
    }

    switch (value.sum.oneofKind) {
        case "unit": return {};
        case "bool": return value.sum.bool;
        case "int64": return int64(value.sum.int64, "int64");
        case "date": return date(value.sum.date);
        case "timestamp": return timestamp(value.sum.timestamp);
        case "numeric": return numeric(value.sum.numeric);
        case "party": return validPartyId(value.sum.party);
        case "text": return value.sum.text;
        case "contractId": return validLedgerString(value.sum.contractId, "contract id");
        case "optional": return value.sum.optional.value === undefined ? null : mapValue(value.sum.optional.value, depth + 1);
        case "list": return value.sum.list.elements.map((entry) => mapValue(entry, depth + 1));
        case "textMap": return mapTextMap(value.sum.textMap.entries, depth + 1);
        case "genMap": return mapGenMap(value.sum.genMap.entries, depth + 1);
        case "record": return mapRecord(value.sum.record.fields, depth + 1);
        case "variant": {
            if (value.sum.variant.constructor.length === 0 || value.sum.variant.value === undefined) {
                throw new ValidationError("gRPC query variant is incomplete");
            }

            return { tag: value.sum.variant.constructor, value: mapValue(value.sum.variant.value, depth + 1) };
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

function mapRecord(fields: readonly { readonly label: string; readonly value?: Value }[], depth: number): Record<string, unknown> {
    const output: Record<string, unknown> = Object.create(null) as Record<string, unknown>;

    for (const [index, field] of fields.entries()) {
        if (field.label.length === 0) {
            throw new ValidationError(`gRPC query record field ${index} is unlabeled; verbose values are required`);
        } else if (Object.hasOwn(output, field.label)) {
            throw new ValidationError(`gRPC query record has duplicate label ${field.label}`);
        } else if (field.value === undefined) {
            throw new ValidationError(`gRPC query record field ${field.label} has no value`);
        }

        defineData(output, field.label, mapValue(field.value, depth));
    }

    return output;
}

function mapTextMap(entries: readonly { readonly key: string; readonly value?: Value }[], depth: number): Record<string, unknown> {
    const output: Record<string, unknown> = Object.create(null) as Record<string, unknown>;

    for (const [index, entry] of entries.entries()) {
        if (Object.hasOwn(output, entry.key)) {
            throw new ValidationError(`gRPC query text-map has duplicate key ${entry.key}`);
        } else if (entry.value === undefined) {
            throw new ValidationError(`gRPC query text-map entry ${index} has no value`);
        }

        defineData(output, entry.key, mapValue(entry.value, depth));
    }

    return output;
}

function mapGenMap(entries: readonly { readonly key?: Value; readonly value?: Value }[], depth: number): readonly (readonly [unknown, unknown])[] {
    const seenKeys = new Set<string>();

    return entries.map((entry, index) => {
        if (entry.key === undefined || entry.value === undefined) {
            throw new ValidationError(`gRPC query gen-map entry ${index} is incomplete`);
        }

        const key = mapValue(entry.key, depth);

        const canonicalKey = canonicalLedgerKey(entry.key);

        if (seenKeys.has(canonicalKey)) {
            throw new ValidationError(`gRPC query gen-map has duplicate key at entry ${index}`);
        }

        seenKeys.add(canonicalKey);

        return [key, mapValue(entry.value, depth)] as const;
    });
}

function canonicalLedgerKey(value: Value): string {
    switch (value.sum.oneofKind) {
        case "unit": return "unit";
        case "bool": return `bool:${value.sum.bool}`;
        case "int64": return `int64:${JSON.stringify(value.sum.int64)}`;
        case "date": return `date:${value.sum.date}`;
        case "timestamp": return `timestamp:${JSON.stringify(value.sum.timestamp)}`;
        case "numeric": return `numeric:${canonicalNumeric(value.sum.numeric)}`;
        case "party": return `party:${JSON.stringify(value.sum.party)}`;
        case "text": return `text:${JSON.stringify(value.sum.text)}`;
        case "contractId": return `contractId:${JSON.stringify(value.sum.contractId)}`;
        case "optional": return value.sum.optional.value === undefined ? "optional:none" : `optional:some(${canonicalLedgerKey(value.sum.optional.value)})`;
        case "list": return `list:[${value.sum.list.elements.map(canonicalLedgerKey).join(",")}]`;
        case "textMap": return `textMap:{${[...value.sum.textMap.entries].sort((left, right) => left.key.localeCompare(right.key)).map((entry) => `${JSON.stringify(entry.key)}:${canonicalLedgerKey(entry.value!)}`).join(",")}}`;
        case "genMap": return `genMap:{${value.sum.genMap.entries.map((entry) => `${canonicalLedgerKey(entry.key!)}:${canonicalLedgerKey(entry.value!)}`).sort().join(",")}}`;
        case "record": return `record:{${[...value.sum.record.fields].sort((left, right) => left.label.localeCompare(right.label)).map((field) => `${JSON.stringify(field.label)}:${canonicalLedgerKey(field.value!)}`).join(",")}}`;
        case "variant": return `variant:${JSON.stringify(value.sum.variant.constructor)}:${canonicalLedgerKey(value.sum.variant.value!)}`;
        case "enum": return `enum:${JSON.stringify(value.sum.enum.constructor)}`;
        case undefined: return invalidGenMapKey();
    }
}

function canonicalNumeric(value: string): string {
    const sign = value.startsWith("-") ? "-" : "";

    const unsigned = value.replace(/^[+-]/, "");

    const [whole, fraction = ""] = unsigned.split(".");

    const normalizedWhole = whole.replace(/^0+(?=\d)/, "");

    const normalizedFraction = fraction.replace(/0+$/, "");

    const normalized = `${normalizedWhole}${normalizedFraction.length === 0 ? "" : `.${normalizedFraction}`}`;

    return /^0(?:\.0*)?$/.test(normalized) ? "0" : `${sign}${normalized}`;
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

/** Validates a generated PartyIdString without applying those rules to ordinary Text values. */
export function validPartyId(value: string): string {
    if (!/^[A-Za-z0-9:\-_ ]{1,255}$/.test(value)) {
        throw new ValidationError("gRPC query party is invalid");
    }

    return value;
}

/** Validates a generated LedgerString used specifically as a contract identifier. */
export function validLedgerString(value: string, name = "ledger string"): string {
    if (!/^[A-Za-z0-9#:\-_/ ]{1,255}$/.test(value)) {
        throw new ValidationError(`gRPC query ${name} is invalid`);
    }

    return value;
}
