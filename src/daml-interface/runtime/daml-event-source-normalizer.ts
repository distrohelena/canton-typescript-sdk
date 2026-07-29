import { MESSAGE_TYPE } from "@protobuf-ts/runtime";
import { GetContractResponse } from "../../transports/grpc/generated/canton/com/daml/ledger/api/v2/contract_service.js";
import { CreatedEvent, Event, ExercisedEvent } from "../../transports/grpc/generated/canton/com/daml/ledger/api/v2/event.js";
import { ActiveContract } from "../../transports/grpc/generated/canton/com/daml/ledger/api/v2/state_service.js";
import type { Record as DamlRecordValue, Value } from "../../transports/grpc/generated/canton/com/daml/ledger/api/v2/value.js";
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
    readonly createdAt?: unknown;
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

const DATE_MUTATORS = [
    "setDate",
    "setFullYear",
    "setHours",
    "setMilliseconds",
    "setMinutes",
    "setMonth",
    "setSeconds",
    "setTime",
    "setUTCDate",
    "setUTCFullYear",
    "setUTCHours",
    "setUTCMilliseconds",
    "setUTCMinutes",
    "setUTCMonth",
    "setUTCSeconds",
] as const;

/**
 * Recognizes a Ledger API create event, a contract response/wrapper, or a
 * PQS/JSON contract record and produces one immutable runtime shape.
 */
export function normalizeDamlCreatedEventSource(
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
        payload: freezeValueSource(payload, recognized.encoding === "protobuf" ? "protobuf-record" : "json"),
        metadata,
    });
}

/**
 * Recognizes a Ledger API exercise event or a PQS/JSON exercise record and
 * produces one immutable runtime shape. Choice information may be supplied by
 * PQS's exercise-type relation and identity by its contract relation.
 */
export function normalizeDamlExercisedEventSource(
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
        offset: optionalString(event, ["offset", "createdEventOffset", "created_event_offset"]),
        nodeId: optionalNodeId(event, ["nodeId", "node_id"], "node ID", "created event source"),
        witnessParties: optionalStringArray(event, ["witnessParties", "witness_parties", "witnesses"], "witness parties", "created event source"),
        signatories: optionalStringArray(event, ["signatories"], "signatories", "created event source"),
        observers: optionalStringArray(event, ["observers"], "observers", "created event source"),
        createdAt: cloneOptionalValue(event, ["createdAt", "created_at"]),
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
        offset: optionalString(event, ["offset"]) ?? optionalString(transaction ?? {}, ["offset"]),
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

function optionalString(event: DamlJsonEventRecord, names: readonly string[]): string | undefined {
    return stringValue(readProperty(event, names).value);
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

function cloneOptionalValue(event: DamlJsonEventRecord, names: readonly string[]): unknown {
    const property = readProperty(event, names);

    return property.found ? cloneAndFreeze(property.value) : undefined;
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
        return immutableDate(value) as T;
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

function immutableDate(value: Date): Date {
    const date = new Date(value.getTime());

    for (const method of DATE_MUTATORS) {
        Object.defineProperty(date, method, {
            value: () => {
                throw new TypeError("canonical Date values are immutable");
            },
        });
    }

    return Object.freeze(date);
}

function removeUndefined<T extends Record<string, unknown>>(value: T): T {
    return Object.fromEntries(Object.entries(value).filter(([, field]) => field !== undefined)) as T;
}

function sourceError(path: string, detail: string): DamlMaterializationError {
    return new DamlMaterializationError(path, detail);
}
