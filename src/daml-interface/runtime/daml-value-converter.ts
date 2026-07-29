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
    const kind = value.sum.oneofKind;

    if (kind === undefined) {
        throw materializationError(path, "value is absent");
    }

    switch (descriptor.kind) {
        case "primitive":
            return decodeProtobufPrimitive(value, descriptor.primitive, path);
        case "contractId":
            return requireProtobufKind(value, "contractId", path).contractId;
        case "optional": {
            const optional = requireProtobufKind(value, "optional", path).optional;

            return optional.value === undefined
                ? undefined
                : decodeDamlValue({ kind: "protobuf", value: optional.value }, descriptor.element, registry, path);
        }
        case "list": {
            const elements = requireProtobufKind(value, "list", path).list.elements;

            return elements.map((element, index) => decodeDamlValue(
                { kind: "protobuf", value: element }, descriptor.element, registry, indexedPath(path, index),
            ));
        }
        case "textMap": {
            const entries = requireProtobufKind(value, "textMap", path).textMap.entries;

            return new DamlTextMap(entries.map((entry, index) => [
                entry.key,
                decodeRequiredProtobufValue(entry.value, descriptor.value, registry, `${indexedPath(path, index)}.${entry.key}`),
            ]));
        }
        case "genMap": {
            const entries = requireProtobufKind(value, "genMap", path).genMap.entries;

            return new DamlGenMap(entries.map((entry, index) => [
                decodeRequiredProtobufValue(entry.key, descriptor.key, registry, `${indexedPath(path, index)}.key`),
                decodeRequiredProtobufValue(entry.value, descriptor.value, registry, `${indexedPath(path, index)}.value`),
            ]));
        }
        case "record":
            return decodeProtobufRecord(value, descriptor, registry, path);
        case "variant": {
            const variant = requireProtobufKind(value, "variant", path).variant;

            const constructor = descriptor.constructors.find((candidate) => candidate.constructor === variant.constructor);

            if (constructor === undefined) {
                throw materializationError(path, `unknown variant constructor ${variant.constructor}`);
            }

            return new DamlVariant(
                variant.constructor,
                decodeRequiredProtobufValue(variant.value, constructor.payload, registry, `${path}.${variant.constructor}`),
            );
        }
        case "enum": {
            const constructor = requireProtobufKind(value, "enum", path).enum.constructor;

            if (!descriptor.constructors.includes(constructor)) {
                throw materializationError(path, `unknown enum constructor ${constructor}`);
            }

            return new DamlEnum(constructor);
        }
    }
}

function decodeProtobufPrimitive(
    value: Value,
    primitive: "unit" | "bool" | "int64" | "date" | "timestamp" | "numeric" | "party" | "text",
    path: string,
): DamlDecodedValue {
    switch (primitive) {
        case "unit":
            requireProtobufKind(value, "unit", path);

            return new DamlUnit();
        case "bool":
            return requireProtobufKind(value, "bool", path).bool;
        case "int64":
            return decodeInt64(requireProtobufKind(value, "int64", path).int64, path);
        case "date":
            return new DamlDate(requireProtobufKind(value, "date", path).date);
        case "timestamp":
            return new DamlTimestamp(requireProtobufKind(value, "timestamp", path).timestamp);
        case "numeric":
            return decodeNumeric(requireProtobufKind(value, "numeric", path).numeric, path);
        case "party":
            return decodeParty(requireProtobufKind(value, "party", path).party, path);
        case "text":
            return requireProtobufKind(value, "text", path).text;
    }
}

function decodeProtobufRecord(
    value: Value,
    descriptor: Extract<DamlTypeDescriptor, { readonly kind: "record" }>,
    registry: DamlTypeDescriptorRegistry,
    path: string,
): DamlRecord {
    const fields = requireProtobufKind(value, "record", path).record.fields;

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
            return decodeJsonPrimitive(value, descriptor.primitive, path);
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

function decodeJsonPrimitive(value: unknown, primitive: "unit" | "bool" | "int64" | "date" | "timestamp" | "numeric" | "party" | "text", path: string): DamlDecodedValue {
    switch (primitive) {
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
            if (typeof value !== "number" || !Number.isSafeInteger(value)) {
                throw materializationError(path, "expected integer date");
            }

            return new DamlDate(value);
        case "timestamp":
            return new DamlTimestamp(requireIntegerString(value, path, "timestamp"));
        case "numeric":
            return decodeNumeric(requireString(value, path, "numeric"), path);
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

function requireProtobufKind<K extends Exclude<Value["sum"]["oneofKind"], undefined>>(value: Value, expected: K, path: string): Extract<Value["sum"], { readonly oneofKind: K }> {
    if (!hasProtobufKind(value, expected)) {
        throw materializationError(path, `expected ${expected} but received ${value.sum.oneofKind ?? "absent"}`);
    }

    return value.sum;
}

function hasProtobufKind<K extends Exclude<Value["sum"]["oneofKind"], undefined>>(
    value: Value,
    expected: K,
): value is Value & { readonly sum: Extract<Value["sum"], { readonly oneofKind: K }> } {
    return value.sum.oneofKind === expected;
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

function decodeNumeric(value: string, path: string): DamlNumeric {
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
