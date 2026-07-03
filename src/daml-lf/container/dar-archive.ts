import { DarManifest } from "./dar-manifest.js";
import { DarPackageEntry } from "./dar-package-entry.js";

export class DarArchive {
    public readonly manifest: DarManifest;
    public readonly mainPackageEntry: DarPackageEntry;
    public readonly packageEntries: readonly DarPackageEntry[];

    public constructor(init: {
        manifest: DarManifest;
        mainPackageEntry: DarPackageEntry;
        packageEntries: readonly DarPackageEntry[];
    }) {
        this.manifest = init.manifest;
        this.mainPackageEntry = init.mainPackageEntry;
        this.packageEntries = init.packageEntries;
    }
}
