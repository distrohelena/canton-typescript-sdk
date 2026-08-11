import {
    AnalyzedDamlEnumType,
    AnalyzedDamlRecordType,
    AnalyzedDamlVariantType,
} from "./analyzed-daml-type.js";
import { DamlLfTypeParameter } from "../../daml-lf/model/daml-lf-data-type.js";
import { TypeConReference } from "../../daml-lf/model/type-con-reference.js";

/** A modeled named DAML data type and its complete serializable shape. */
export type AnalyzedDamlTypeDefinition = {
    readonly identity: TypeConReference;
} & (
    | (AnalyzedDamlRecordType & {
        readonly typeParameters: readonly DamlLfTypeParameter[];
    })
    | (AnalyzedDamlVariantType & {
        readonly typeParameters: readonly DamlLfTypeParameter[];
    })
    | AnalyzedDamlEnumType
);
