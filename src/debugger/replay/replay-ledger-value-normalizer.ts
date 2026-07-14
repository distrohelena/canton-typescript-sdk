import {
    DAML_LF_CONTRACT_ID_MARKER_KEY,
    DAML_LF_NUMERIC_MARKER_KEY,
    DAML_LF_PARTY_MARKER_KEY,
    DAML_LF_RECORD_ID_MARKER_KEY,
} from "../../daml-lf/interpreter/daml-lf-runtime-value.js";

export function normalizeReplayLedgerValue(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map((item) => normalizeReplayLedgerValue(item));
    }

    if (value === null || value === undefined || typeof value !== "object") {
        return value;
    }

    if ("sum" in value && isOneofValue(value.sum)) {
        return normalizeOneofValue(value.sum);
    }

    if (
        "fields" in value
        && Array.isArray(value.fields)
        && value.fields.every(
            (field) =>
                field !== null
                && typeof field === "object"
                && "value" in field,
        )
    ) {
        const normalizedRecord = Object.fromEntries(
            value.fields.map((field, index) => [
                getRecordFieldKey(field, index),
                normalizeReplayLedgerValue(field.value),
            ]),
        );
        const recordId = readRecordId(value);

        return recordId === undefined
            ? normalizedRecord
            : {
                ...normalizedRecord,
                [DAML_LF_RECORD_ID_MARKER_KEY]: recordId,
            };
    }

    return Object.fromEntries(
        Object.entries(value)
            .filter(([, child]) => child !== undefined)
            .map(([key, child]) => [key, normalizeReplayLedgerValue(child)]),
    );
}

export function collectReplayLedgerContractIds(
    value: unknown,
): readonly string[] {
    const contractIds = new Set<string>();
    collectContractIdsInto(value, contractIds);
    return [...contractIds];
}

export function attachReplayRecordId(
    value: unknown,
    recordId: {
        packageId?: string;
        moduleName?: string;
        entityName?: string;
    } | undefined,
): unknown {
    if (
        recordId === undefined
        || value === null
        || value === undefined
        || typeof value !== "object"
        || Array.isArray(value)
        || DAML_LF_RECORD_ID_MARKER_KEY in value
    ) {
        return value;
    }

    return {
        ...(value as Record<string, unknown>),
        [DAML_LF_RECORD_ID_MARKER_KEY]: recordId,
    };
}

function isOneofValue(
    value: unknown,
): value is { oneofKind?: string } & Record<string, unknown> {
    return value !== null && typeof value === "object";
}

function normalizeOneofValue(
    value: { oneofKind?: string } & Record<string, unknown>,
): unknown {
    switch (value.oneofKind) {
        case "unit":
            return null;
        case "bool":
        case "int64":
        case "date":
        case "timestamp":
        case "text":
            return value[value.oneofKind];
        case "numeric":
            return {
                [DAML_LF_NUMERIC_MARKER_KEY]: value.numeric,
            };
        case "party":
            return {
                [DAML_LF_PARTY_MARKER_KEY]: value.party,
            };
        case "contractId":
            return {
                [DAML_LF_CONTRACT_ID_MARKER_KEY]: value.contractId,
            };
        case "optional":
            return normalizeOptionalValue(value.optional);
        case "list":
            return normalizeListValue(value.list);
        case "textMap":
            return normalizeTextMapValue(value.textMap);
        case "genMap":
            return normalizeGenMapValue(value.genMap);
        case "record":
            return normalizeReplayLedgerValue(value.record);
        case "variant":
            return {
                constructor: readObjectString(value.variant, "constructor"),
                value: normalizeReplayLedgerValue(
                    readObjectProperty(value.variant, "value"),
                ),
            };
        case "enum":
            return readObjectString(value.enum, "constructor");
        default:
            return value;
    }
}

function normalizeOptionalValue(value: unknown): unknown {
    if (value === null || value === undefined || typeof value !== "object") {
        return undefined;
    }

    return normalizeReplayLedgerValue(readObjectProperty(value, "value"));
}

function normalizeListValue(value: unknown): unknown {
    if (value === null || value === undefined || typeof value !== "object") {
        return [];
    }

    const elements = readObjectProperty(value, "elements");
    return Array.isArray(elements)
        ? elements.map((element) => normalizeReplayLedgerValue(element))
        : [];
}

function normalizeTextMapValue(value: unknown): unknown {
    if (value === null || value === undefined || typeof value !== "object") {
        return {};
    }

    const entries = readObjectProperty(value, "entries");

    if (!Array.isArray(entries)) {
        return {};
    }

    return Object.fromEntries(
        entries.map((entry) => [
            readObjectString(entry, "key"),
            normalizeReplayLedgerValue(readObjectProperty(entry, "value")),
        ]),
    );
}

function normalizeGenMapValue(value: unknown): unknown {
    if (value === null || value === undefined || typeof value !== "object") {
        return [];
    }

    const entries = readObjectProperty(value, "entries");

    if (!Array.isArray(entries)) {
        return [];
    }

    return entries.map((entry) => ({
        key: normalizeReplayLedgerValue(readObjectProperty(entry, "key")),
        value: normalizeReplayLedgerValue(readObjectProperty(entry, "value")),
    }));
}

function getRecordFieldKey(field: unknown, index: number): string {
    if (
        field !== null
        && typeof field === "object"
        && "label" in field
        && typeof field.label === "string"
        && field.label.length > 0
    ) {
        return field.label;
    }

    return index.toString();
}

function readObjectProperty(
    value: unknown,
    propertyName: string,
): unknown {
    if (value === null || value === undefined || typeof value !== "object") {
        return undefined;
    }

    return (value as Record<string, unknown>)[propertyName];
}

function readObjectString(value: unknown, propertyName: string): string {
    const property = readObjectProperty(value, propertyName);
    return typeof property === "string" ? property : "";
}

function readRecordId(value: unknown): {
    packageId?: string;
    moduleName?: string;
    entityName?: string;
} | undefined {
    const recordId = readObjectProperty(value, "recordId");

    if (recordId === undefined || recordId === null || typeof recordId !== "object") {
        return undefined;
    }

    return {
        packageId: readOptionalObjectString(recordId, "packageId"),
        moduleName: readOptionalObjectString(recordId, "moduleName"),
        entityName: readOptionalObjectString(recordId, "entityName"),
    };
}

function readOptionalObjectString(
    value: unknown,
    propertyName: string,
): string | undefined {
    const property = readObjectProperty(value, propertyName);
    return typeof property === "string" && property.length > 0
        ? property
        : undefined;
}

function collectContractIdsInto(
    value: unknown,
    contractIds: Set<string>,
): void {
    if (Array.isArray(value)) {
        for (const item of value) {
            collectContractIdsInto(item, contractIds);
        }

        return;
    }

    if (value === null || value === undefined || typeof value !== "object") {
        return;
    }

    if (
        DAML_LF_CONTRACT_ID_MARKER_KEY in value
        && typeof value[DAML_LF_CONTRACT_ID_MARKER_KEY] === "string"
    ) {
        contractIds.add(value[DAML_LF_CONTRACT_ID_MARKER_KEY]);
        return;
    }

    for (const child of Object.values(value)) {
        collectContractIdsInto(child, contractIds);
    }
}
