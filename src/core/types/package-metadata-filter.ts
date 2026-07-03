export class PackageMetadataFilter {
    public readonly packageIds: string[];
    public readonly packageNamePrefixes: string[];

    public constructor(init: {
        packageIds?: string[];
        packageNamePrefixes?: string[];
    } = {}) {
        this.packageIds = [...(init.packageIds ?? [])];
        this.packageNamePrefixes = [...(init.packageNamePrefixes ?? [])];
    }
}
