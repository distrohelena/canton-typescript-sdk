export class KnownPackageDetails {
    public readonly packageId: string;
    public readonly packageSize: string;
    public readonly knownSince?: Date;
    public readonly name: string;
    public readonly version: string;

    public constructor(init: {
        packageId: string;
        packageSize: string;
        knownSince?: Date;
        name: string;
        version: string;
    }) {
        this.packageId = init.packageId;
        this.packageSize = init.packageSize;
        this.knownSince = init.knownSince;
        this.name = init.name;
        this.version = init.version;
    }
}
