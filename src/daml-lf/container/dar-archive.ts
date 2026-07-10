import { DarManifest } from "./dar-manifest.js";
import { DarArchiveEntry } from "./dar-archive-entry.js";
import { DarPackageEntry } from "./dar-package-entry.js";
import { DarSourceFileEntry } from "./dar-source-file-entry.js";

export class DarArchive {
    public readonly entries: readonly DarArchiveEntry[];
    public readonly manifest: DarManifest;
    public readonly mainPackageEntry: DarPackageEntry;
    public readonly packageEntries: readonly DarPackageEntry[];
    public readonly sourceFiles: readonly DarSourceFileEntry[];

    public constructor(init: {
        entries: readonly DarArchiveEntry[];
        manifest: DarManifest;
        mainPackageEntry: DarPackageEntry;
        packageEntries: readonly DarPackageEntry[];
        sourceFiles: readonly DarSourceFileEntry[];
    }) {
        this.entries = init.entries;
        this.manifest = init.manifest;
        this.mainPackageEntry = init.mainPackageEntry;
        this.packageEntries = init.packageEntries;
        this.sourceFiles = init.sourceFiles;
    }
}
