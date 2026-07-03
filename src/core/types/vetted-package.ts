export class VettedPackage {
    public readonly packageId: string;
    public readonly validFromInclusive?: Date;
    public readonly validUntilExclusive?: Date;
    public readonly packageName?: string;
    public readonly packageVersion?: string;

    public constructor(init: {
        packageId: string;
        validFromInclusive?: Date;
        validUntilExclusive?: Date;
        packageName?: string;
        packageVersion?: string;
    }) {
        this.packageId = init.packageId;
        this.validFromInclusive = init.validFromInclusive;
        this.validUntilExclusive = init.validUntilExclusive;
        this.packageName = init.packageName;
        this.packageVersion = init.packageVersion;
    }
}
