export class DarManifest {
    public readonly mainDalfPath: string;
    public readonly manifestVersion?: string;

    public constructor(init: {
        mainDalfPath: string;
        manifestVersion?: string;
    }) {
        this.mainDalfPath = init.mainDalfPath;
        this.manifestVersion = init.manifestVersion;
    }
}
