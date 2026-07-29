import { DamlLfBuiltinType } from "../../daml-lf/model/daml-lf-builtin-type.js";
import { TypeConReference } from "../../daml-lf/model/type-con-reference.js";

export type AnalyzedDamlPrimitiveType = {
    readonly kind: "primitive";
    readonly builtinType:
        | DamlLfBuiltinType.unit
        | DamlLfBuiltinType.bool
        | DamlLfBuiltinType.int64
        | DamlLfBuiltinType.date
        | DamlLfBuiltinType.timestamp
        | DamlLfBuiltinType.numeric
        | DamlLfBuiltinType.party
        | DamlLfBuiltinType.text;
    readonly numericScale?: number;
};

export type AnalyzedDamlContractIdType = {
    readonly kind: "contractId";
};

export type AnalyzedDamlOptionalType = {
    readonly kind: "optional";
    readonly element: AnalyzedDamlType;
};

export type AnalyzedDamlListType = {
    readonly kind: "list";
    readonly element: AnalyzedDamlType;
};

export type AnalyzedDamlTextMapType = {
    readonly kind: "textMap";
    readonly value: AnalyzedDamlType;
};

export type AnalyzedDamlGenMapType = {
    readonly kind: "genMap";
    readonly key: AnalyzedDamlType;
    readonly value: AnalyzedDamlType;
};

export type AnalyzedDamlRecordField = {
    readonly damlLabel: string;
    readonly propertyName: string;
    readonly type: AnalyzedDamlType;
};

export type AnalyzedDamlRecordType = {
    readonly kind: "record";
    readonly fields: readonly AnalyzedDamlRecordField[];
};

export type AnalyzedDamlVariantConstructor = {
    readonly constructor: string;
    readonly payload: AnalyzedDamlType;
};

export type AnalyzedDamlVariantType = {
    readonly kind: "variant";
    readonly constructors: readonly AnalyzedDamlVariantConstructor[];
};

export type AnalyzedDamlEnumType = {
    readonly kind: "enum";
    readonly constructors: readonly string[];
};

export type AnalyzedDamlNamedReferenceType = {
    readonly kind: "namedReference";
    readonly identity: TypeConReference;
};

/** Closed, immutable description of a DAML value serializable by the generator. */
export type AnalyzedDamlType =
    | AnalyzedDamlPrimitiveType
    | AnalyzedDamlContractIdType
    | AnalyzedDamlOptionalType
    | AnalyzedDamlListType
    | AnalyzedDamlTextMapType
    | AnalyzedDamlGenMapType
    | AnalyzedDamlRecordType
    | AnalyzedDamlVariantType
    | AnalyzedDamlEnumType
    | AnalyzedDamlNamedReferenceType;
