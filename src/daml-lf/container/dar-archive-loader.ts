import { strFromU8, unzipSync } from "fflate";
import { DamlLfArchiveException } from "../errors/daml-lf-archive.exception.js";
import { DarArchive } from "./dar-archive.js";
import { DarArchiveEntry } from "./dar-archive-entry.js";
import { DarManifest } from "./dar-manifest.js";
import { DarPackageEntry } from "./dar-package-entry.js";
import { DarSourceFileEntry } from "./dar-source-file-entry.js";

export class DarArchiveLoader {
    public async loadDarOrThrowAsync(archiveBytes: Uint8Array): Promise<DarArchive> {
        try {
            const archiveEntries = unzipSync(archiveBytes);

            const manifestBytes = archiveEntries["META-INF/MANIFEST.MF"];

            if (manifestBytes === undefined) {
                throw new DamlLfArchiveException(
                    "dar archive does not contain META-INF/MANIFEST.MF",
                );
            }

            const manifest = this.parseManifestOrThrow(strFromU8(manifestBytes));
            const entries = Object.entries(archiveEntries).map(
                ([path, bytes]) =>
                    new DarArchiveEntry({
                        path,
                        bytes,
                    }),
            );

            const packageEntries = Object.entries(archiveEntries)
                .filter(([path]) => path.endsWith(".dalf"))
                .map(
                    ([path, bytes]) =>
                        new DarPackageEntry({
                            path,
                            bytes,
                        }),
                );
            const sourceFiles = Object.entries(archiveEntries)
                .filter(([path]) => path.endsWith(".daml"))
                .map(
                    ([path, bytes]) =>
                        new DarSourceFileEntry({
                            path,
                            content: strFromU8(bytes),
                        }),
                );

            const mainPackageEntry = packageEntries.find(
                (entry) => entry.path === manifest.mainDalfPath,
            );

            if (mainPackageEntry === undefined) {
                throw new DamlLfArchiveException(
                    `dar archive does not contain the main dalf entry '${manifest.mainDalfPath}'`,
                );
            }

            return new DarArchive({
                entries,
                manifest,
                mainPackageEntry,
                packageEntries,
                sourceFiles,
            });
        } catch (error) {
            if (error instanceof DamlLfArchiveException) {
                throw error;
            }

            throw new DamlLfArchiveException(
                error instanceof Error
                    ? error.message
                    : "failed to read dar archive",
            );
        }
    }

    private parseManifestOrThrow(manifestText: string): DarManifest {
        const properties = new Map<string, string>();

        let currentKey: string | undefined;

        for (const rawLine of manifestText.split(/\r?\n/)) {
            if (rawLine.startsWith(" ") && currentKey !== undefined) {
                const currentValue = properties.get(currentKey) ?? "";

                properties.set(currentKey, `${currentValue}${rawLine.slice(1)}`);

                continue;
            }

            const line = rawLine.trim();

            if (line.length === 0) {
                currentKey = undefined;

                continue;
            }

            const delimiterIndex = line.indexOf(":");

            if (delimiterIndex < 0) {
                currentKey = undefined;

                continue;
            }

            const key = line.slice(0, delimiterIndex).trim();

            const value = line.slice(delimiterIndex + 1).trim();

            properties.set(key, value);
            currentKey = key;
        }

        const mainDalfPath = properties.get("Main-Dalf");

        if (mainDalfPath === undefined || mainDalfPath.length === 0) {
            throw new DamlLfArchiveException(
                "dar manifest does not declare Main-Dalf",
            );
        }

        return new DarManifest({
            mainDalfPath,
            manifestVersion: properties.get("Manifest-Version"),
        });
    }
}
