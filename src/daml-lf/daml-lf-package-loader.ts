import { Package as LfArchivePackage } from "../transports/grpc/generated/canton/com/digitalasset/daml/lf/archive/daml_lf2.js";
import { ArchivePayloadDecoder } from "./decoding/archive-payload-decoder.js";
import { DamlLfLanguageVersion } from "./decoding/daml-lf-language-version.js";
import { PackageDecoderRegistry } from "./decoding/package-decoder-registry.js";
import { DamlLfPackage } from "./model/daml-lf-package.js";
import { Lf2ModelMapper } from "./model/lf-2-model-mapper.js";

export class DamlLfPackageLoadResult {
    public readonly packageId: string;
    public readonly languageVersion: DamlLfLanguageVersion;
    public readonly rawPackage: LfArchivePackage;

    public constructor(init: {
        packageId: string;
        languageVersion: DamlLfLanguageVersion;
        rawPackage: LfArchivePackage;
    }) {
        this.packageId = init.packageId;
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

    public loadRawPackageOrThrow(
        archiveBytes: Uint8Array,
    ): DamlLfPackageLoadResult {
        const envelope =
            ArchivePayloadDecoder.decodeArchiveOrThrow(archiveBytes);

        const rawPackage = this.packageDecoderRegistry.decodePackageOrThrow(
            envelope.packagePayload,
            envelope.languageVersion,
        );

        return new DamlLfPackageLoadResult({
            packageId: envelope.packageId,
            languageVersion: envelope.languageVersion,
            rawPackage,
        });
    }

    public loadPackageOrThrow(archiveBytes: Uint8Array): DamlLfPackage {
        const result = this.loadRawPackageOrThrow(archiveBytes);

        return Lf2ModelMapper.mapPackage(
            result.packageId,
            result.rawPackage,
            result.languageVersion,
        );
    }
}
