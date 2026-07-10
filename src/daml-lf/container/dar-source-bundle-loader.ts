import { strFromU8 } from "fflate";
import { DamlLfArchiveException } from "../errors/daml-lf-archive.exception.js";
import { DarArchiveLoader } from "./dar-archive-loader.js";
import {
    DarSourceBundle,
    DarSourceBundleMetadataExecutable,
} from "./dar-source-bundle.js";

export class DarSourceBundleLoader {
    private readonly archiveLoader = new DarArchiveLoader();

    public async loadSourceBundleOrThrowAsync(
        archiveBytes: Uint8Array,
    ): Promise<DarSourceBundle> {
        const archive = await this.archiveLoader.loadDarOrThrowAsync(archiveBytes);

        const metadataEntry = archive.entries.find(
            (entry) => entry.path === "debug/source-map.json",
        );

        if (metadataEntry === undefined) {
            throw new DamlLfArchiveException(
                "dar archive does not contain debug/source-map.json",
            );
        }

        const metadata = JSON.parse(
            strFromU8(metadataEntry.bytes),
        ) as Partial<{
            executables: DarSourceBundleMetadataExecutable[];
        }>;

        if (!Array.isArray(metadata.executables)) {
            throw new DamlLfArchiveException(
                "dar source-map metadata must define an executables array",
            );
        }

        return new DarSourceBundle({
            sourceFiles: archive.sourceFiles,
            metadata: {
                packageId:
                    typeof metadata.packageId === "string"
                        ? metadata.packageId
                        : undefined,
                importedPackages: Array.isArray(metadata.importedPackages)
                    ? metadata.importedPackages.filter(
                          (entry): entry is string => typeof entry === "string",
                      )
                    : [],
                executables: metadata.executables,
            },
        });
    }
}
