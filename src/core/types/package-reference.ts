export class PackageReference {
    public readonly packageId: string;
    public readonly packageName: string;
    public readonly packageVersion: string;

    public constructor(init: {
        packageId: string;
        packageName: string;
        packageVersion: string;
    }) {
        this.packageId = init.packageId;
        this.packageName = init.packageName;
        this.packageVersion = init.packageVersion;
    }
}
