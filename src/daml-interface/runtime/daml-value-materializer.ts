import {
    DamlEnum,
    DamlGenMap,
    DamlRecord,
    DamlTextMap,
    DamlVariant,
} from "../../core/types/daml-values.js";
import { DamlDecodedValue } from "./daml-value-converter.js";

/** Converts decoded DAML containers into the shapes exposed by generated TypeScript declarations. */
export class DamlValueMaterializer {
    private constructor() {}

    public static materialize<T>(value: DamlDecodedValue): T {
        return materializeDamlValue(value);
    }
}

function materializeDamlValue<T>(value: DamlDecodedValue): T {
    return materialize(value) as T;
}

function materialize(value: DamlDecodedValue): unknown {
    if (value instanceof DamlRecord) {
        return Object.fromEntries(Object.entries(value.fields).map(([name, field]) => [name, materialize(field as DamlDecodedValue)]));
    } else if (value instanceof DamlVariant) {
        return Object.freeze({ tag: value.constructorName, value: materialize(value.value as DamlDecodedValue) });
    } else if (value instanceof DamlEnum) {
        return value.constructorName;
    } else if (value instanceof DamlTextMap || value instanceof DamlGenMap) {
        return new Map(value.entries.map(([key, entry]) => [materialize(key as DamlDecodedValue), materialize(entry as DamlDecodedValue)]));
    } else if (Array.isArray(value)) {
        return value.map((element) => materialize(element));
    }

    return value;
}
