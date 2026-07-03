import { Package as LfArchivePackage } from "../transports/grpc/generated/canton/com/digitalasset/daml/lf/archive/daml_lf2.js";
import { ArchivePayloadDecoder } from "./decoding/archive-payload-decoder.js";
import { DamlLfLanguageVersion } from "./decoding/daml-lf-language-version.js";
import { PackageDecoderRegistry } from "./decoding/package-decoder-registry.js";

export class DamlLfPackageLoadResult {
    public readonly languageVersion: DamlLfLanguageVersion;
    public readonly rawPackage: LfArchivePackage;

    public constructor(init: {
        languageVersion: DamlLfLanguageVersion;
        rawPackage: LfArchivePackage;
    }) {
        this.languageVersion = init.languageVersion;
        this.rawPackage = init.rawPackage;
    }
}

export class DamlLfPackageLoader {
    public constructor(
        private readonly packageDecoderRegistry: PackageDecoderRegistry = new PackageDecoderRegistry(),
    ) {
        void this.packageDecoderRegistry;
    }

    public loadPackageOrThrow(archiveBytes: Uint8Array): DamlLfPackageLoadResult {
        const envelope =
            ArchivePayloadDecoder.decodeArchiveOrThrow(archiveBytes);
        const rawPackage = this.packageDecoderRegistry.decodePackageOrThrow(
            envelope.packagePayload,
            envelope.languageVersion,
        );

        return new DamlLfPackageLoadResult({
            languageVersion: envelope.languageVersion,
            rawPackage,
        });
    }
}
