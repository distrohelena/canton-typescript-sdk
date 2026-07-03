import { Package as LfArchivePackage } from "../../transports/grpc/generated/canton/com/digitalasset/daml/lf/archive/daml_lf2.js";
import { DamlLfDecodeException } from "../errors/daml-lf-decode.exception.js";
import { DamlLfLanguageVersion } from "./daml-lf-language-version.js";
import { IPackageDecoder } from "./package-decoder.interface.js";

export class Lf2PackageDecoder implements IPackageDecoder<LfArchivePackage> {
    public canDecode(languageVersion: DamlLfLanguageVersion): boolean {
        return languageVersion.major === 2;
    }

    public decodePackageOrThrow(packageBytes: Uint8Array): LfArchivePackage {
        try {
            return LfArchivePackage.fromBinary(packageBytes);
        } catch (error) {
            throw new DamlLfDecodeException(
                error instanceof Error
                    ? error.message
                    : "failed to decode daml lf 2.x package",
            );
        }
    }
}
