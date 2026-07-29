import {
    AnalyzedDamlEnumType,
    AnalyzedDamlRecordType,
    AnalyzedDamlVariantType,
} from "./analyzed-daml-type.js";
import { TypeConReference } from "../../daml-lf/model/type-con-reference.js";

/** A reachable named DAML data type and its complete serializable shape. */
export type AnalyzedDamlTypeDefinition = {
    readonly identity: TypeConReference;
} & (
    | AnalyzedDamlRecordType
    | AnalyzedDamlVariantType
    | AnalyzedDamlEnumType
);
