import { Value } from "../../transports/grpc/generated/canton/com/daml/ledger/api/v2/value.js";

export type DamlTypeIdentity = {
    readonly packageId: string;
    readonly moduleName: string;
    readonly entityName: string;
};

export type DamlPrimitiveType =
    | "unit"
    | "bool"
    | "int64"
    | "date"
    | "timestamp"
    | "numeric"
    | "party"
    | "text";

export type DamlPrimitiveDescriptor = {
    readonly kind: "primitive";
    readonly primitive: DamlPrimitiveType;
    readonly numericScale?: number;
};

export type DamlContractIdDescriptor = {
    readonly kind: "contractId";
    readonly contract?: DamlTypeDescriptor;
};

export type DamlOptionalDescriptor = {
    readonly kind: "optional";
    readonly element: DamlTypeDescriptor;
};

export type DamlListDescriptor = {
    readonly kind: "list";
    readonly element: DamlTypeDescriptor;
};

export type DamlTextMapDescriptor = {
    readonly kind: "textMap";
    readonly value: DamlTypeDescriptor;
};

export type DamlGenMapDescriptor = {
    readonly kind: "genMap";
    readonly key: DamlTypeDescriptor;
    readonly value: DamlTypeDescriptor;
};

export type DamlRecordFieldDescriptor = {
    readonly damlLabel: string;
    readonly propertyName: string;
    readonly type: DamlTypeDescriptor;
};

export type DamlRecordDescriptor = {
    readonly kind: "record";
    readonly fields: readonly DamlRecordFieldDescriptor[];
};

export type DamlVariantConstructorDescriptor = {
    readonly constructor: string;
    readonly payload: DamlTypeDescriptor;
};

export type DamlVariantDescriptor = {
    readonly kind: "variant";
    readonly constructors: readonly DamlVariantConstructorDescriptor[];
};

export type DamlEnumDescriptor = {
    readonly kind: "enum";
    readonly constructors: readonly string[];
};

export type DamlNamedReferenceDescriptor = {
    readonly kind: "namedReference";
    readonly identity: DamlTypeIdentity;
    readonly typeArguments: readonly DamlTypeDescriptor[];
};

/** A closed description of a serializable DAML value. */
export type DamlTypeDescriptor =
    | DamlPrimitiveDescriptor
    | DamlContractIdDescriptor
    | DamlOptionalDescriptor
    | DamlListDescriptor
    | DamlTextMapDescriptor
    | DamlGenMapDescriptor
    | DamlRecordDescriptor
    | DamlVariantDescriptor
    | DamlEnumDescriptor
    | DamlNamedReferenceDescriptor;

/** Resolves named descriptors lazily so recursive data types remain finite. */
export type DamlTypeDescriptorRegistry = {
    readonly resolve: (
        identity: DamlTypeIdentity,
        typeArguments: readonly DamlTypeDescriptor[],
    ) => DamlTypeDescriptor | undefined;
};

export type DamlValueSource =
    | { readonly kind: "protobuf"; readonly value: Value }
    | { readonly kind: "json"; readonly value: unknown };
