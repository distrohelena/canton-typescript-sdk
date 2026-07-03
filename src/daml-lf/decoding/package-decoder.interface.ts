import { DamlLfLanguageVersion } from "./daml-lf-language-version.js";

export interface IPackageDecoder<TPackage> {
    canDecode(languageVersion: DamlLfLanguageVersion): boolean;
    decodePackageOrThrow(packageBytes: Uint8Array): TPackage;
}
