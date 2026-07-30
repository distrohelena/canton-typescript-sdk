import { MESSAGE_TYPE, type JsonValue } from "@protobuf-ts/runtime";
import { GetContractResponse } from "../../transports/grpc/generated/canton/com/daml/ledger/api/v2/contract_service.js";
import { CreatedEvent, Event, ExercisedEvent } from "../../transports/grpc/generated/canton/com/daml/ledger/api/v2/event.js";
import { ActiveContract } from "../../transports/grpc/generated/canton/com/daml/ledger/api/v2/state_service.js";
import { Value, type Record as DamlRecordValue } from "../../transports/grpc/generated/canton/com/daml/ledger/api/v2/value.js";
import type { ContractResult, ExerciseResult } from "../../query/model-types.js";
import { DamlMaterializationError } from "./daml-materialization-error.js";
import type { DamlTypeIdentity, DamlValueSource } from "./daml-type-descriptor.js";

export type DamlJsonEventRecord = Readonly<Record<string, unknown>>;

export type DamlCreatedEventSource =
    | CreatedEvent
    | GetContractResponse
    | ActiveContract
    | ContractResult
    | Event
    | DamlJsonEventRecord;

export type DamlExercisedEventSource =
    | ExercisedEvent
    | ExerciseResult
    | Event
    | DamlJsonEventRecord;

export type DamlCreatedEventMetadata = {
    readonly templateId: DamlTypeIdentity;
    readonly offset?: string;
    readonly nodeId?: number;
    readonly witnessParties?: readonly string[];
    readonly signatories?: readonly string[];
    readonly observers?: readonly string[];
    /** Canonical UTC ISO-8601 timestamp. */
    readonly createdAt?: string;
};

export type DamlExercisedEventMetadata = {
    readonly templateId: DamlTypeIdentity;
    readonly offset?: string;
    readonly nodeId?: number;
    readonly actingParties?: readonly string[];
    readonly witnessParties?: readonly string[];
    readonly lastDescendantNodeId?: number;
};

export type DamlNormalizedCreatedEvent = {
    readonly kind: "created";
    readonly contractId: string;
    readonly payload: DamlValueSource;
    readonly metadata: DamlCreatedEventMetadata;
};

export type DamlNormalizedExercisedEvent = {
    readonly kind: "exercised";
    readonly contractId: string;
    readonly choice: string;
    readonly argument: DamlValueSource;
    readonly result: DamlValueSource;
    readonly consuming: boolean;
    readonly metadata: DamlExercisedEventMetadata;
};

type RecognizedEvent = {
    readonly event: DamlJsonEventRecord;
    readonly encoding: "protobuf" | "json";
};

const DAML_MIN_TIMESTAMP_SECONDS = -62135596800n;

const DAML_MAX_TIMESTAMP_SECONDS = 253402300799n;

/** Recognizes Ledger API and PQS event sources as immutable DAML event shapes. */
export class DamlEventSourceNormalizer {
    private constructor() {}

    /** Recognizes a Ledger API create event, contract response/wrapper, or PQS/JSON contract record. */
    public static normalizeCreated(
        source: DamlCreatedEventSource,
    ): DamlNormalizedCreatedEvent {
        return normalizeDamlCreatedEventSource(source);
    }

    /** Recognizes a Ledger API exercise event or a PQS/JSON exercise record. */
    public static normalizeExercised(
        source: DamlExercisedEventSource,
    ): DamlNormalizedExercisedEvent {
        return normalizeDamlExercisedEventSource(source);
    }
}

function normalizeDamlCreatedEventSource(
    source: DamlCreatedEventSource,
): DamlNormalizedCreatedEvent {
    const recognized = findNestedEvent(source, "created");

    const { event } = recognized;

    const contractId = requiredString(event, ["contractId", "contract_id"], "contract ID", "created event source");

    const templateId = requiredIdentity(event, source, "created event source");

    const payload = requiredProperty(event, ["createArguments", "create_arguments", "payload"], "created payload", "created event source");

    const metadata = freezeCreatedMetadata(event, templateId);

    return Object.freeze({
        kind: "created" as const,
        contractId,
        payload: freezeCreatedValueSource(payload, recognized.encoding),
        metadata,
    });
}

function normalizeDamlExercisedEventSource(
    source: DamlExercisedEventSource,
): DamlNormalizedExercisedEvent {
    const recognized = findNestedEvent(source, "exercised");

    const { event } = recognized;

    const contractId = requiredString(event, ["contractId", "contract_id"], "contract ID", "exercised event source");

    const templateId = requiredIdentity(event, source, "exercised event source");

    const choice = requiredStringFrom(event, source, ["choice"], "choice", "exercised event source");

    const consuming = requiredBooleanFrom(event, source, ["consuming"], "consuming", "exercised event source");

    const argument = requiredProperty(event, ["choiceArgument", "choice_argument", "argument"], "exercise argument", "exercised event source");

    const result = requiredProperty(event, ["exerciseResult", "exercise_result", "result"], "exercise result", "exercised event source");

    const metadata = freezeExercisedMetadata(event, source, templateId);

    return Object.freeze({
        kind: "exercised" as const,
        contractId,
        choice,
        argument: freezeValueSource(argument, recognized.encoding),
        result: freezeValueSource(result, recognized.encoding),
        consuming,
        metadata,
    });
}

function findNestedEvent(source: unknown, kind: "created" | "exercised"): RecognizedEvent {
    const root = objectOrThrow(source, `${kind} event source`, "source must be an object");

    const candidates: RecognizedEvent[] = [];

    const aliases = kind === "created" ? ["createdEvent", "created_event"] : ["exercisedEvent", "exercised_event"];

    if (looksLikeEvent(root, kind)) {
        candidates.push({ event: root, encoding: protobufEncoding(root, kind) });
    }

    for (const alias of aliases) {
        if (hasValue(root, alias)) {
            candidates.push({ event: objectOrThrow(root[alias], `${kind} event source`, "event must be an object"), encoding: protobufEncoding(root, kind) });
        }
    }

    const nested = asObject(root.event);

    if (nested !== undefined) {
        const nestedAliases = kind === "created" ? ["created", "createdEvent", "created_event"] : ["exercised", "exercisedEvent", "exercised_event"];

        for (const alias of nestedAliases) {
            if (hasValue(nested, alias)) {
                candidates.push({ event: objectOrThrow(nested[alias], `${kind} event source`, "event must be an object"), encoding: protobufEncoding(nested[alias], kind) });
            }
        }
    }

    if (candidates.length === 0) {
        throw sourceError(`${kind} event source`, "no event or payload was found");
    } else if (candidates.length !== 1) {
        throw sourceError(`${kind} event source`, "ambiguous nested event");
    }

    return candidates[0] as RecognizedEvent;
}

function protobufEncoding(value: unknown, kind: "created" | "exercised"): "protobuf" | "json" {
    if (isGeneratedMessage(value, kind === "created" ? CreatedEvent : ExercisedEvent)) {
        return "protobuf";
    } else if (kind === "created" && (isGeneratedMessage(value, GetContractResponse) || isGeneratedMessage(value, ActiveContract))) {
        return "protobuf";
    }

    return "json";
}

function isGeneratedMessage(value: unknown, type: unknown): boolean {
    return value !== null
        && typeof value === "object"
        && (value as { readonly [MESSAGE_TYPE]?: unknown })[MESSAGE_TYPE] === type;
}

function looksLikeEvent(value: DamlJsonEventRecord, kind: "created" | "exercised"): boolean {
    const fields = kind === "created"
        ? ["contractId", "contract_id", "templateId", "template_id", "createArguments", "create_arguments", "payload"]
        : ["contractId", "contract_id", "templateId", "template_id", "choiceArgument", "choice_argument", "argument", "exerciseResult", "exercise_result", "result"];

    return fields.some((field) => Object.prototype.hasOwnProperty.call(value, field));
}

function requiredIdentity(
    event: DamlJsonEventRecord,
    source: unknown,
    path: string,
): DamlTypeIdentity {
    const direct = readProperty(event, ["templateId", "template_id"]);

    if (direct.found) {
        return identityFrom(direct.value, path);
    }

    const root = asObject(source);

    const contract = asObject(readProperty(event, ["contract"]).value) ?? asObject(root?.contract);

    const contractIdentity = contract === undefined ? { found: false } : readProperty(contract, ["templateId", "template_id"]);

    if (contractIdentity.found) {
        return identityFrom(contractIdentity.value, path);
    }

    const type = asObject(readProperty(event, ["exerciseType", "exercise_type", "contractType", "contract_type"]).value)
        ?? asObject(root?.exerciseType)
        ?? asObject(root?.exercise_type)
        ?? asObject(root?.contractType)
        ?? asObject(root?.contract_type);

    const packageRecord = asObject(readProperty(event, ["package"]).value) ?? asObject(root?.package);

    if (type !== undefined) {
        return identityFrom({
            packageId: readProperty(type, ["packageId", "package_id"]).value ?? readProperty(packageRecord ?? {}, ["id", "packageId", "package_id"]).value,
            moduleName: readProperty(type, ["moduleName", "module_name"]).value,
            entityName: readProperty(type, ["entityName", "entity_name"]).value,
        }, path);
    }

    throw sourceError(path, "template identity is absent");
}

function identityFrom(value: unknown, path: string): DamlTypeIdentity {
    const identifier = asObject(value);

    if (identifier === undefined) {
        throw sourceError(path, "template identity is absent");
    }

    const packageId = stringValue(readProperty(identifier, ["packageId", "package_id"]).value);

    const moduleName = stringValue(readProperty(identifier, ["moduleName", "module_name"]).value);

    const entityName = stringValue(readProperty(identifier, ["entityName", "entity_name"]).value);

    if (packageId === undefined || moduleName === undefined || entityName === undefined) {
        throw sourceError(path, "template identity is incomplete");
    }

    return Object.freeze({ packageId, moduleName, entityName });
}

function freezeCreatedMetadata(event: DamlJsonEventRecord, templateId: DamlTypeIdentity): DamlCreatedEventMetadata {
    return Object.freeze(removeUndefined({
        templateId,
        offset: optionalString(event, ["offset", "createdEventOffset", "created_event_offset"], "offset", "created event source"),
        nodeId: optionalNodeId(event, ["nodeId", "node_id"], "node ID", "created event source"),
        witnessParties: optionalStringArray(event, ["witnessParties", "witness_parties", "witnesses"], "witness parties", "created event source"),
        signatories: optionalStringArray(event, ["signatories"], "signatories", "created event source"),
        observers: optionalStringArray(event, ["observers"], "observers", "created event source"),
        createdAt: optionalCreatedAt(event, ["createdAt", "created_at"], "created event source"),
    }));
}

function freezeExercisedMetadata(
    event: DamlJsonEventRecord,
    source: unknown,
    templateId: DamlTypeIdentity,
): DamlExercisedEventMetadata {
    const root = asObject(source);

    const transaction = asObject(readProperty(event, ["transaction"]).value) ?? asObject(root?.transaction);

    return Object.freeze(removeUndefined({
        templateId,
        offset: optionalString(event, ["offset"], "offset", "exercised event source")
            ?? optionalString(transaction ?? {}, ["offset"], "offset", "exercised event source"),
        nodeId: optionalNodeId(event, ["nodeId", "node_id"], "node ID", "exercised event source"),
        actingParties: optionalStringArray(event, ["actingParties", "acting_parties", "controllers"], "acting parties", "exercised event source"),
        witnessParties: optionalStringArray(event, ["witnessParties", "witness_parties", "witnesses"], "witness parties", "exercised event source"),
        lastDescendantNodeId: optionalNodeId(event, ["lastDescendantNodeId", "last_descendant_node_id"], "last descendant node ID", "exercised event source"),
    }));
}

function requiredStringFrom(
    event: DamlJsonEventRecord,
    source: unknown,
    names: readonly string[],
    label: string,
    path: string,
): string {
    const direct = readProperty(event, names);

    if (direct.found) {
        return requiredStringValue(direct.value, label, path);
    }

    const root = asObject(source);

    const type = asObject(readProperty(event, ["exerciseType", "exercise_type"]).value)
        ?? asObject(root?.exerciseType)
        ?? asObject(root?.exercise_type);

    const nested = type === undefined ? { found: false } : readProperty(type, names);

    return requiredStringValue(nested.value, label, path);
}

function requiredBooleanFrom(
    event: DamlJsonEventRecord,
    source: unknown,
    names: readonly string[],
    label: string,
    path: string,
): boolean {
    const direct = readProperty(event, names);

    if (direct.found) {
        return requiredBooleanValue(direct.value, label, path);
    }

    const root = asObject(source);

    const type = asObject(readProperty(event, ["exerciseType", "exercise_type"]).value)
        ?? asObject(root?.exerciseType)
        ?? asObject(root?.exercise_type);

    const nested = type === undefined ? { found: false } : readProperty(type, names);

    return requiredBooleanValue(nested.value, label, path);
}

function requiredString(
    event: DamlJsonEventRecord,
    names: readonly string[],
    label: string,
    path: string,
): string {
    return requiredStringValue(readProperty(event, names).value, label, path);
}

function requiredStringValue(value: unknown, label: string, path: string): string {
    const string = stringValue(value);

    if (string === undefined) {
        throw sourceError(path, `${label} is absent`);
    }

    return string;
}

function requiredBooleanValue(value: unknown, label: string, path: string): boolean {
    if (typeof value !== "boolean") {
        throw sourceError(path, `${label} is absent`);
    }

    return value;
}

function requiredProperty(
    event: DamlJsonEventRecord,
    names: readonly string[],
    label: string,
    path: string,
): unknown {
    const property = readProperty(event, names);

    if (!property.found) {
        throw sourceError(path, `${label} is absent`);
    }

    return property.value;
}

function freezeValueSource(value: unknown, encoding: "protobuf" | "protobuf-record" | "json"): DamlValueSource {
    if (encoding === "protobuf") {
        return Object.freeze({ kind: "protobuf" as const, value: cloneAndFreeze(value) as Value });
    } else if (encoding === "protobuf-record") {
        return Object.freeze({
            kind: "protobuf" as const,
            value: cloneAndFreeze({ sum: { oneofKind: "record" as const, record: value as DamlRecordValue } }) as Value,
        });
    }

    return Object.freeze({ kind: "json" as const, value: cloneAndFreeze(value) });
}

function freezeCreatedValueSource(value: unknown, encoding: "protobuf" | "json"): DamlValueSource {
    if (encoding === "protobuf") {
        return freezeValueSource(value, "protobuf-record");
    } else if (isRecordWireJson(value)) {
        return freezeValueSource(Value.fromJson({ record: value } as JsonValue), "protobuf");
    }

    return freezeValueSource(value, "json");
}

const VALUE_JSON_VARIANTS = new Set([
    "unit",
    "bool",
    "int64",
    "date",
    "timestamp",
    "numeric",
    "party",
    "text",
    "contractId",
    "optional",
    "list",
    "textMap",
    "genMap",
    "record",
    "variant",
    "enum",
]);

function isRecordWireJson(value: unknown): value is DamlJsonEventRecord {
    const record = asObject(value);

    return record !== undefined
        && hasOnlyKeys(record, ["recordId", "fields"])
        && Array.isArray(record.fields)
        && isAbsentOr(record, "recordId", isIdentifierJson)
        && record.fields.every(isRecordFieldJson);
}

function isRecordFieldJson(value: unknown): boolean {
    const field = asObject(value);

    return field !== undefined
        && hasOnlyKeys(field, ["label", "value"])
        && isAbsentOr(field, "label", (label) => typeof label === "string")
        && isValueJson(field.value);
}

function isValueJson(value: unknown): boolean {
    const json = asObject(value);

    if (json === undefined) {
        return false;
    }

    const variants = Object.keys(json).filter((key) => VALUE_JSON_VARIANTS.has(key));

    if (variants.length !== 1 || Object.keys(json).length !== 1) {
        return false;
    }

    const variant = variants[0];

    switch (variant) {
        case "unit":
            return isEmptyJsonObject(json.unit);
        case "bool":
            return typeof json.bool === "boolean";
        case "int64":
        case "timestamp":
        case "numeric":
        case "party":
        case "text":
        case "contractId":
            return typeof json[variant] === "string";
        case "date":
            return typeof json.date === "number" && Number.isSafeInteger(json.date);
        case "optional":
            return isOptionalJson(json.optional);
        case "list":
            return isListJson(json.list);
        case "textMap":
            return isTextMapJson(json.textMap);
        case "genMap":
            return isGenMapJson(json.genMap);
        case "record":
            return isNestedRecordJson(json.record);
        case "variant":
            return isVariantJson(json.variant);
        case "enum":
            return isEnumJson(json.enum);
        default:
            return false;
    }
}

function isEmptyJsonObject(value: unknown): boolean {
    const json = asObject(value);

    return json !== undefined && Object.keys(json).length === 0;
}

function isOptionalJson(value: unknown): boolean {
    const json = asObject(value);

    return json !== undefined
        && hasOnlyKeys(json, ["value"])
        && isAbsentOr(json, "value", isValueJson);
}

function isListJson(value: unknown): boolean {
    const json = asObject(value);

    return json !== undefined
        && hasOnlyKeys(json, ["elements"])
        && isAbsentOr(json, "elements", (elements) => Array.isArray(elements) && elements.every(isValueJson));
}

function isTextMapJson(value: unknown): boolean {
    const json = asObject(value);

    return json !== undefined
        && hasOnlyKeys(json, ["entries"])
        && isAbsentOr(json, "entries", (entries) => Array.isArray(entries) && entries.every((entry) => {
            const item = asObject(entry);

            return item !== undefined
                && hasOnlyKeys(item, ["key", "value"])
                && typeof item.key === "string"
                && isValueJson(item.value);
        }));
}

function isGenMapJson(value: unknown): boolean {
    const json = asObject(value);

    return json !== undefined
        && hasOnlyKeys(json, ["entries"])
        && isAbsentOr(json, "entries", (entries) => Array.isArray(entries) && entries.every((entry) => {
            const item = asObject(entry);

            return item !== undefined
                && hasOnlyKeys(item, ["key", "value"])
                && isValueJson(item.key)
                && isValueJson(item.value);
        }));
}

function isNestedRecordJson(value: unknown): boolean {
    const record = asObject(value);

    return record !== undefined
        && hasOnlyKeys(record, ["recordId", "fields"])
        && isAbsentOr(record, "recordId", isIdentifierJson)
        && isAbsentOr(record, "fields", (fields) => Array.isArray(fields) && fields.every(isRecordFieldJson));
}

function isVariantJson(value: unknown): boolean {
    const variant = asObject(value);

    return variant !== undefined
        && hasOnlyKeys(variant, ["variantId", "constructor", "value"])
        && isAbsentOr(variant, "variantId", isIdentifierJson)
        && typeof variant.constructor === "string"
        && isValueJson(variant.value);
}

function isEnumJson(value: unknown): boolean {
    const enumValue = asObject(value);

    return enumValue !== undefined
        && hasOnlyKeys(enumValue, ["enumId", "constructor"])
        && isAbsentOr(enumValue, "enumId", isIdentifierJson)
        && typeof enumValue.constructor === "string";
}

function isIdentifierJson(value: unknown): boolean {
    const identifier = asObject(value);

    return identifier !== undefined
        && hasOnlyKeys(identifier, ["packageId", "moduleName", "entityName"])
        && typeof identifier.packageId === "string"
        && typeof identifier.moduleName === "string"
        && typeof identifier.entityName === "string";
}

function hasOnlyKeys(value: DamlJsonEventRecord, keys: readonly string[]): boolean {
    return Object.keys(value).every((key) => keys.includes(key));
}

function isAbsentOr(
    value: DamlJsonEventRecord,
    key: string,
    predicate: (property: unknown) => boolean,
): boolean {
    return !Object.prototype.hasOwnProperty.call(value, key) || predicate(value[key]);
}

function optionalString(
    event: DamlJsonEventRecord,
    names: readonly string[],
    label: string,
    path: string,
): string | undefined {
    const property = readProperty(event, names);

    if (!property.found) {
        return undefined;
    }

    const value = stringValue(property.value);

    if (value === undefined) {
        throw sourceError(path, `${label} must be a non-empty string`);
    }

    return value;
}

function optionalNodeId(event: DamlJsonEventRecord, names: readonly string[], label: string, path: string): number | undefined {
    const property = readProperty(event, names);

    if (!property.found) {
        return undefined;
    }

    const value = property.value;

    const number = typeof value === "number" ? value : typeof value === "string" && /^\d+$/.test(value) ? Number(value) : undefined;

    if (number === undefined || !Number.isSafeInteger(number) || number < 0) {
        throw sourceError(path, `${label} must be a non-negative safe integer`);
    }

    return number;
}

function optionalStringArray(
    event: DamlJsonEventRecord,
    names: readonly string[],
    label: string,
    path: string,
): readonly string[] | undefined {
    const property = readProperty(event, names);

    if (!property.found) {
        return undefined;
    } else if (!Array.isArray(property.value) || !property.value.every((item) => typeof item === "string")) {
        throw sourceError(path, `${label} must be an array of strings`);
    }

    return cloneAndFreeze(property.value) as readonly string[];
}

function optionalCreatedAt(event: DamlJsonEventRecord, names: readonly string[], path: string): string | undefined {
    const property = readProperty(event, names);

    if (!property.found || property.value === null) {
        return undefined;
    } else if (property.value instanceof Date) {
        return canonicalDateTimestamp(property.value, path);
    } else if (typeof property.value === "string") {
        return canonicalIsoTimestamp(property.value, path);
    }

    return canonicalProtobufTimestamp(property.value, path);
}

function canonicalIsoTimestamp(value: string, path: string): string {
    const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,9}))?Z$/.exec(value);

    if (match === null) {
        throw sourceError(path, "created at must be a UTC ISO-8601 timestamp");
    }

    const milliseconds = (match[2] ?? "").padEnd(3, "0").slice(0, 3);

    const date = new Date(`${match[1]}.${milliseconds}Z`);

    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 19) !== match[1]) {
        throw sourceError(path, "created at must be a valid timestamp");
    }

    requireLedgerTimestampSeconds(BigInt(Math.floor(date.getTime() / 1000)), path);

    return `${match[1]}.${(match[2] ?? "").padEnd(9, "0")}Z`;
}

function canonicalProtobufTimestamp(value: unknown, path: string): string {
    const timestamp = asObject(value);

    const seconds = timestamp === undefined ? undefined : readProperty(timestamp, ["seconds"]).value;

    const nanos = timestamp === undefined ? undefined : readProperty(timestamp, ["nanos"]).value;

    if (typeof seconds !== "string" || !/^-?\d+$/.test(seconds) || typeof nanos !== "number" || !Number.isSafeInteger(nanos) || nanos < 0 || nanos > 999999999) {
        throw sourceError(path, "created at must be a valid timestamp");
    }

    const secondsValue = BigInt(seconds);

    requireLedgerTimestampSeconds(secondsValue, path);

    const date = new Date(Number(secondsValue * 1000n));

    if (Number.isNaN(date.getTime())) {
        throw sourceError(path, "created at must be a valid timestamp");
    }

    const base = date.toISOString().replace(".000Z", "");

    return `${base}.${nanos.toString().padStart(9, "0")}Z`;
}

function canonicalDateTimestamp(value: Date, path: string): string {
    const milliseconds = value.getTime();

    if (Number.isNaN(milliseconds)) {
        throw sourceError(path, "created at must be a valid timestamp");
    }

    requireLedgerTimestampSeconds(BigInt(Math.floor(milliseconds / 1000)), path);

    return value.toISOString().replace(/\.(\d{3})Z$/, (_match, milliseconds: string) => `.${milliseconds}000000Z`);
}

function requireLedgerTimestampSeconds(seconds: bigint, path: string): void {
    if (seconds < DAML_MIN_TIMESTAMP_SECONDS || seconds > DAML_MAX_TIMESTAMP_SECONDS) {
        throw sourceError(path, "created at must be within DAML timestamp bounds");
    }
}

function readProperty(object: DamlJsonEventRecord, names: readonly string[]): { readonly found: boolean; readonly value?: unknown } {
    for (const name of names) {
        if (Object.prototype.hasOwnProperty.call(object, name) && object[name] !== undefined) {
            return { found: true, value: object[name] };
        }
    }

    return { found: false };
}

function hasValue(object: DamlJsonEventRecord, name: string): boolean {
    return Object.prototype.hasOwnProperty.call(object, name) && object[name] !== undefined;
}

function objectOrThrow(value: unknown, path: string, detail: string): DamlJsonEventRecord {
    const object = asObject(value);

    if (object === undefined) {
        throw sourceError(path, detail);
    }

    return object;
}

function asObject(value: unknown): DamlJsonEventRecord | undefined {
    return value !== null && typeof value === "object" && !Array.isArray(value)
        ? value as DamlJsonEventRecord
        : undefined;
}

function stringValue(value: unknown): string | undefined {
    return typeof value === "string" && value.length > 0 ? value : undefined;
}

function cloneAndFreeze<T>(value: T, seen = new WeakMap<object, unknown>()): T {
    if (value === null || typeof value !== "object") {
        return value;
    } else if (value instanceof Date) {
        return Object.freeze(new Date(value.getTime())) as T;
    }

    const existing = seen.get(value);

    if (existing !== undefined) {
        return existing as T;
    }

    const output: Record<PropertyKey, unknown> | unknown[] = Array.isArray(value)
        ? []
        : Object.create(Object.getPrototypeOf(value)) as Record<PropertyKey, unknown>;

    seen.set(value, output);

    for (const key of Reflect.ownKeys(value)) {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);

        if (descriptor !== undefined && "value" in descriptor) {
            Object.defineProperty(output, key, { ...descriptor, value: cloneAndFreeze(descriptor.value, seen) });
        }
    }

    return Object.freeze(output) as T;
}

function removeUndefined<T extends Record<string, unknown>>(value: T): T {
    return Object.fromEntries(Object.entries(value).filter(([, field]) => field !== undefined)) as T;
}

function sourceError(path: string, detail: string): DamlMaterializationError {
    return new DamlMaterializationError(path, detail);
}
