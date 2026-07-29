import {
    DamlDate,
    DamlEnum,
    DamlGenMap,
    DamlRecord,
    DamlTextMap,
    DamlTimestamp,
    DamlUnit,
    DamlVariant,
} from "../../core/types/daml-values.js";
import { DamlNumeric } from "../../core/types/daml-numeric.js";
import { DamlParty } from "../../core/types/daml-party.js";
import { Value } from "../../transports/grpc/generated/canton/com/daml/ledger/api/v2/value.js";
import { DamlMaterializationError } from "./daml-materialization-error.js";
import {
    DamlTypeDescriptor,
    DamlTypeDescriptorRegistry,
    DamlValueSource,
} from "./daml-type-descriptor.js";

export type DamlDecodedValue =
    | DamlUnit
    | boolean
    | bigint
    | DamlDate
    | DamlTimestamp
    | DamlNumeric
    | DamlParty
    | string
    | undefined
    | readonly DamlDecodedValue[]
    | DamlTextMap
    | DamlGenMap
    | DamlRecord
    | DamlVariant
    | DamlEnum;

const DAML_MIN_DATE_DAYS_SINCE_EPOCH = -719162;

const DAML_MAX_DATE_DAYS_SINCE_EPOCH = 2932896;

const DAML_MIN_TIMESTAMP_MICROSECONDS = -62135596800000000n;

const DAML_MAX_TIMESTAMP_MICROSECONDS = 253402300799999999n;

/** Decodes a protobuf or JSON/PQS DAML value according to its generated descriptor. */
export function decodeDamlValue(
    source: DamlValueSource,
    descriptor: DamlTypeDescriptor,
    registry: DamlTypeDescriptorRegistry,
    path: string,
): DamlDecodedValue {
    if (descriptor.kind === "namedReference") {
        const factory = registry.resolve(descriptor.identity);

        if (factory === undefined) {
            throw materializationError(path, "named type descriptor is not registered");
        }

        return decodeDamlValue(source, factory(), registry, path);
    } else if (source.kind === "protobuf") {
        return decodeProtobufValue(source.value, descriptor, registry, path);
    }

    return decodeJsonValue(source.value, descriptor, registry, path);
}

function decodeProtobufValue(
    value: Value,
    descriptor: Exclude<DamlTypeDescriptor, { readonly kind: "namedReference" }>,
    registry: DamlTypeDescriptorRegistry,
    path: string,
): DamlDecodedValue {
    switch (value.sum.oneofKind) {
        case undefined:
            throw materializationError(path, "value is absent");
        case "unit":
            requirePrimitiveDescriptor(descriptor, "unit", path);

            return new DamlUnit();
        case "bool":
            requirePrimitiveDescriptor(descriptor, "bool", path);

            return value.sum.bool;
        case "int64":
            requirePrimitiveDescriptor(descriptor, "int64", path);

            return decodeInt64(value.sum.int64, path);
        case "date":
            requirePrimitiveDescriptor(descriptor, "date", path);

            return decodeDate(value.sum.date, path);
        case "timestamp":
            requirePrimitiveDescriptor(descriptor, "timestamp", path);

            return decodeTimestamp(value.sum.timestamp, path);
        case "numeric":
            requirePrimitiveDescriptor(descriptor, "numeric", path);

            return decodeNumeric(value.sum.numeric, descriptor.numericScale, path);
        case "party":
            requirePrimitiveDescriptor(descriptor, "party", path);

            return decodeParty(value.sum.party, path);
        case "text":
            requirePrimitiveDescriptor(descriptor, "text", path);

            return value.sum.text;
        case "contractId":
            requireDescriptorKind(descriptor, "contractId", path, "contractId");

            return value.sum.contractId;
        case "optional":
            requireDescriptorKind(descriptor, "optional", path, "optional");

            return value.sum.optional.value === undefined
                ? undefined
                : decodeDamlValue({ kind: "protobuf", value: value.sum.optional.value }, descriptor.element, registry, path);
        case "list":
            requireDescriptorKind(descriptor, "list", path, "list");

            return value.sum.list.elements.map((element, index) => decodeDamlValue(
                { kind: "protobuf", value: element }, descriptor.element, registry, indexedPath(path, index),
            ));
        case "textMap":
            requireDescriptorKind(descriptor, "textMap", path, "textMap");

            return new DamlTextMap(value.sum.textMap.entries.map((entry, index) => [
                entry.key,
                decodeRequiredProtobufValue(entry.value, descriptor.value, registry, `${indexedPath(path, index)}.${entry.key}`),
            ]));
        case "genMap":
            requireDescriptorKind(descriptor, "genMap", path, "genMap");

            return new DamlGenMap(value.sum.genMap.entries.map((entry, index) => [
                decodeRequiredProtobufValue(entry.key, descriptor.key, registry, `${indexedPath(path, index)}.key`),
                decodeRequiredProtobufValue(entry.value, descriptor.value, registry, `${indexedPath(path, index)}.value`),
            ]));
        case "record":
            requireDescriptorKind(descriptor, "record", path, "record");

            return decodeProtobufRecord(value.sum.record, descriptor, registry, path);
        case "variant": {
            requireDescriptorKind(descriptor, "variant", path, "variant");

            const variant = value.sum.variant;

            const constructor = descriptor.constructors.find((candidate) => candidate.constructor === variant.constructor);

            if (constructor === undefined) {
                throw materializationError(path, `unknown variant constructor ${variant.constructor}`);
            }

            return new DamlVariant(
                variant.constructor,
                decodeRequiredProtobufValue(variant.value, constructor.payload, registry, `${path}.${variant.constructor}`),
            );
        }
        case "enum":
            requireDescriptorKind(descriptor, "enum", path, "enum");

            if (!descriptor.constructors.includes(value.sum.enum.constructor)) {
                throw materializationError(path, `unknown enum constructor ${value.sum.enum.constructor}`);
            }

            return new DamlEnum(value.sum.enum.constructor);
        default:
            return rejectUnknownProtobufKind(path, value.sum);
    }
}

function decodeProtobufRecord(
    record: Extract<Value["sum"], { readonly oneofKind: "record" }>["record"],
    descriptor: Extract<DamlTypeDescriptor, { readonly kind: "record" }>,
    registry: DamlTypeDescriptorRegistry,
    path: string,
): DamlRecord {
    const fields = record.fields;

    const labelsPresent = fields.every((field) => field.label.length > 0);

    const labelsAbsent = fields.every((field) => field.label.length === 0);

    if (!labelsPresent && !labelsAbsent) {
        throw materializationError(path, "record fields mix labelled and positional encodings");
    }

    const output: Record<string, DamlDecodedValue> = Object.create(null);

    if (labelsPresent) {
        if (new Set(fields.map((field) => field.label)).size !== fields.length) {
            throw materializationError(path, "record contains duplicate field labels");
        }

        for (const field of descriptor.fields) {
            const sourceField = fields.find((candidate) => candidate.label === field.damlLabel);

            if (sourceField === undefined) {
                throw materializationError(fieldPath(path, field.propertyName), "required record field is absent");
            }

            output[field.propertyName] = decodeRequiredProtobufValue(sourceField.value, field.type, registry, fieldPath(path, field.propertyName));
        }

        if (fields.length !== descriptor.fields.length) {
            throw materializationError(path, "record contains an unexpected field");
        }
    } else {
        if (fields.length !== descriptor.fields.length) {
            throw materializationError(path, "record has the wrong number of positional fields");
        }

        descriptor.fields.forEach((field, index) => {
            output[field.propertyName] = decodeRequiredProtobufValue(fields[index]?.value, field.type, registry, fieldPath(path, field.propertyName));
        });
    }

    return new DamlRecord(output);
}

function decodeJsonValue(
    value: unknown,
    descriptor: Exclude<DamlTypeDescriptor, { readonly kind: "namedReference" }>,
    registry: DamlTypeDescriptorRegistry,
    path: string,
): DamlDecodedValue {
    switch (descriptor.kind) {
        case "primitive":
            return decodeJsonPrimitive(value, descriptor, path);
        case "contractId":
            return requireString(value, path, "contract ID");
        case "optional":
            return value === null ? undefined : decodeDamlValue({ kind: "json", value }, descriptor.element, registry, path);
        case "list":
            return requireArray(value, path, "list").map((element, index) => decodeDamlValue({ kind: "json", value: element }, descriptor.element, registry, indexedPath(path, index)));
        case "textMap":
            return decodeJsonTextMap(value, descriptor, registry, path);
        case "genMap":
            return new DamlGenMap(requireArray(value, path, "generic map").map((entry, index) => {
                const pair = requireArray(entry, indexedPath(path, index), "generic map entry");

                if (pair.length !== 2) {
                    throw materializationError(indexedPath(path, index), "generic map entries must contain key and value");
                }

                return [
                    decodeDamlValue({ kind: "json", value: pair[0] }, descriptor.key, registry, `${indexedPath(path, index)}.key`),
                    decodeDamlValue({ kind: "json", value: pair[1] }, descriptor.value, registry, `${indexedPath(path, index)}.value`),
                ];
            }));
        case "record":
            return decodeJsonRecord(value, descriptor, registry, path);
        case "variant":
            return decodeJsonVariant(value, descriptor, registry, path);
        case "enum": {
            const constructor = requireString(value, path, "enum constructor");

            if (!descriptor.constructors.includes(constructor)) {
                throw materializationError(path, `unknown enum constructor ${constructor}`);
            }

            return new DamlEnum(constructor);
        }
    }
}

function decodeJsonPrimitive(
    value: unknown,
    descriptor: Extract<DamlTypeDescriptor, { readonly kind: "primitive" }>,
    path: string,
): DamlDecodedValue {
    switch (descriptor.primitive) {
        case "unit": {
            const record = requireObject(value, path, "unit");

            if (Object.keys(record).length !== 0) {
                throw materializationError(path, "unit must be an empty object");
            }

            return new DamlUnit();
        }
        case "bool":
            if (typeof value !== "boolean") {
                throw materializationError(path, "expected boolean");
            }

            return value;
        case "int64":
            return decodeInt64(requireString(value, path, "int64"), path);
        case "date":
            return decodeDate(value, path);
        case "timestamp":
            return decodeTimestamp(value, path);
        case "numeric":
            return decodeNumeric(requireString(value, path, "numeric"), descriptor.numericScale, path);
        case "party":
            return decodeParty(requireString(value, path, "party"), path);
        case "text":
            return requireString(value, path, "text");
    }
}

function decodeJsonTextMap(value: unknown, descriptor: Extract<DamlTypeDescriptor, { readonly kind: "textMap" }>, registry: DamlTypeDescriptorRegistry, path: string): DamlTextMap {
    const record = requireObject(value, path, "text map");

    return new DamlTextMap(objectEntries(record).map(([key, entryValue]) => [
        key,
        decodeDamlValue({ kind: "json", value: entryValue }, descriptor.value, registry, fieldPath(path, key)),
    ]));
}

function decodeJsonRecord(value: unknown, descriptor: Extract<DamlTypeDescriptor, { readonly kind: "record" }>, registry: DamlTypeDescriptorRegistry, path: string): DamlRecord {
    const output: Record<string, DamlDecodedValue> = Object.create(null);

    if (Array.isArray(value)) {
        if (value.length !== descriptor.fields.length) {
            throw materializationError(path, "record has the wrong number of positional fields");
        }

        descriptor.fields.forEach((field, index) => {
            output[field.propertyName] = decodeDamlValue({ kind: "json", value: value[index] }, field.type, registry, fieldPath(path, field.propertyName));
        });

        return new DamlRecord(output);
    }

    const record = requireObject(value, path, "record");

    const expectedLabels = new Set(descriptor.fields.map((field) => field.damlLabel));

    for (const [label] of objectEntries(record)) {
        if (!expectedLabels.has(label)) {
            throw materializationError(path, `record contains unexpected field ${label}`);
        }
    }

    for (const field of descriptor.fields) {
        if (!Object.hasOwn(record, field.damlLabel)) {
            throw materializationError(fieldPath(path, field.propertyName), "required record field is absent");
        }

        output[field.propertyName] = decodeDamlValue({ kind: "json", value: Reflect.get(record, field.damlLabel) }, field.type, registry, fieldPath(path, field.propertyName));
    }

    return new DamlRecord(output);
}

function decodeJsonVariant(value: unknown, descriptor: Extract<DamlTypeDescriptor, { readonly kind: "variant" }>, registry: DamlTypeDescriptorRegistry, path: string): DamlVariant {
    const envelope = requireObject(value, path, "variant");

    const tag = requireString(Reflect.get(envelope, "tag"), path, "variant tag");

    const constructor = descriptor.constructors.find((candidate) => candidate.constructor === tag);

    if (constructor === undefined) {
        throw materializationError(path, `unknown variant constructor ${tag}`);
    } else if (!Object.hasOwn(envelope, "value")) {
        throw materializationError(path, "variant value is absent");
    }

    return new DamlVariant(tag, decodeDamlValue({ kind: "json", value: Reflect.get(envelope, "value") }, constructor.payload, registry, `${path}.${tag}`));
}

function decodeRequiredProtobufValue(value: Value | undefined, descriptor: DamlTypeDescriptor, registry: DamlTypeDescriptorRegistry, path: string): DamlDecodedValue {
    if (value === undefined) {
        throw materializationError(path, "required value is absent");
    }

    return decodeDamlValue({ kind: "protobuf", value }, descriptor, registry, path);
}

function requirePrimitiveDescriptor(
    descriptor: Exclude<DamlTypeDescriptor, { readonly kind: "namedReference" }>,
    primitive: "unit" | "bool" | "int64" | "date" | "timestamp" | "numeric" | "party" | "text",
    path: string,
): asserts descriptor is Extract<DamlTypeDescriptor, { readonly kind: "primitive" }> {
    if (descriptor.kind !== "primitive" || descriptor.primitive !== primitive) {
        throw materializationError(path, `expected ${descriptor.kind} but received ${primitive}`);
    }
}

function requireDescriptorKind<K extends Exclude<DamlTypeDescriptor["kind"], "namedReference">>(
    descriptor: Exclude<DamlTypeDescriptor, { readonly kind: "namedReference" }>,
    expected: K,
    path: string,
    received: string,
): asserts descriptor is Extract<DamlTypeDescriptor, { readonly kind: K }> {
    if (descriptor.kind !== expected) {
        throw materializationError(path, `expected ${descriptor.kind} but received ${received}`);
    }
}

function rejectUnknownProtobufKind(path: string, _value: never): never {
    throw materializationError(path, "value has an unknown protobuf oneof kind");
}

function requireArray(value: unknown, path: string, description: string): readonly unknown[] {
    if (!Array.isArray(value)) {
        throw materializationError(path, `expected ${description} array`);
    }

    return value;
}

function requireObject(value: unknown, path: string, description: string): object {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        throw materializationError(path, `expected ${description} object`);
    }

    return value;
}

function requireString(value: unknown, path: string, description: string): string {
    if (typeof value !== "string") {
        throw materializationError(path, `expected ${description} string`);
    }

    return value;
}

function requireIntegerString(value: unknown, path: string, description: string): string {
    const result = requireString(value, path, description);

    if (!/^-?(?:0|[1-9]\d*)$/.test(result)) {
        throw materializationError(path, `expected ${description} integer string`);
    }

    return result;
}

function decodeInt64(value: string, path: string): bigint {
    const integer = requireIntegerString(value, path, "int64");

    try {
        return BigInt(integer);
    } catch {
        throw materializationError(path, "invalid int64");
    }
}

function decodeDate(value: unknown, path: string): DamlDate {
    if (typeof value !== "number" || !Number.isSafeInteger(value)) {
        throw materializationError(path, "expected integer date");
    } else if (value < DAML_MIN_DATE_DAYS_SINCE_EPOCH || value > DAML_MAX_DATE_DAYS_SINCE_EPOCH) {
        throw materializationError(path, "date is outside the DAML ledger range");
    }

    return new DamlDate(value);
}

function decodeTimestamp(value: unknown, path: string): DamlTimestamp {
    const microseconds = requireIntegerString(value, path, "timestamp");

    const timestamp = BigInt(microseconds);

    if (timestamp < DAML_MIN_TIMESTAMP_MICROSECONDS || timestamp > DAML_MAX_TIMESTAMP_MICROSECONDS) {
        throw materializationError(path, "timestamp is outside the DAML ledger range");
    }

    return new DamlTimestamp(microseconds);
}

function decodeNumeric(value: string, numericScale: number | undefined, path: string): DamlNumeric {
    const decimalSeparator = value.indexOf(".");

    const fractionLength = decimalSeparator === -1 ? 0 : value.length - decimalSeparator - 1;

    const precision = value.replace(/[-.]/g, "").length;

    const maxScale = numericScale ?? 37;

    if (!Number.isInteger(maxScale) || maxScale < 0 || maxScale > 37) {
        throw materializationError(path, "numeric descriptor has an invalid scale");
    } else if (precision > 38) {
        throw materializationError(path, "numeric exceeds DAML ledger precision");
    } else if (fractionLength > maxScale) {
        throw materializationError(path, "numeric exceeds its DAML scale");
    }

    try {
        return new DamlNumeric(value);
    } catch {
        throw materializationError(path, "invalid numeric");
    }
}

function decodeParty(value: string, path: string): DamlParty {
    try {
        return new DamlParty(value);
    } catch {
        throw materializationError(path, "invalid party");
    }
}

function objectEntries(record: object): readonly (readonly [string, unknown])[] {
    return Object.keys(record).map((key): readonly [string, unknown] => [key, Reflect.get(record, key)]);
}

function fieldPath(path: string, propertyName: string): string {
    return `${path}.${propertyName}`;
}

function indexedPath(path: string, index: number): string {
    return `${path}[${index}]`;
}

function materializationError(path: string, detail: string): DamlMaterializationError {
    return new DamlMaterializationError(path, detail);
}
