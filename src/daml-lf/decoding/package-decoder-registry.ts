import { Package as LfArchivePackage } from "../../transports/grpc/generated/canton/com/digitalasset/daml/lf/archive/daml_lf2.js";
import { DamlLfVersionNotSupportedException } from "../errors/daml-lf-version-not-supported.exception.js";
import { DamlLfLanguageVersion } from "./daml-lf-language-version.js";
import { Lf2PackageDecoder } from "./lf-2-package-decoder.js";
import { IPackageDecoder } from "./package-decoder.interface.js";

export class PackageDecoderRegistry {
    private readonly decoders: readonly IPackageDecoder<LfArchivePackage>[];

    public constructor(
        decoders: readonly IPackageDecoder<LfArchivePackage>[] = [
            new Lf2PackageDecoder(),
        ],
    ) {
        this.decoders = decoders;
    }

    public decodePackageOrThrow(
        packageBytes: Uint8Array,
        languageVersion: DamlLfLanguageVersion,
    ): LfArchivePackage {
        const decoder = this.decoders.find((candidate) =>
            candidate.canDecode(languageVersion),
        );

        if (decoder === undefined) {
            throw new DamlLfVersionNotSupportedException(
                `daml lf ${languageVersion.toString()} is not supported yet`,
            );
        }

        return decoder.decodePackageOrThrow(packageBytes);
    }
}
