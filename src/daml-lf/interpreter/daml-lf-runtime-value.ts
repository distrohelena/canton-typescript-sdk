export interface IDamlLfRuntimeValue {
    readonly kind: string;
    readonly [key: string]: unknown;
}

export const DAML_LF_CONTRACT_ID_MARKER_KEY = "__damlLfContractId";
export const DAML_LF_RECORD_ID_MARKER_KEY = "__damlLfRecordId";

export interface IDamlLfContractIdMarkerValue {
    readonly [DAML_LF_CONTRACT_ID_MARKER_KEY]: string;
}

export interface IDamlLfRecordIdMarkerValue {
    readonly [DAML_LF_RECORD_ID_MARKER_KEY]: {
        readonly packageId?: string;
        readonly moduleName?: string;
        readonly entityName?: string;
    };
}
