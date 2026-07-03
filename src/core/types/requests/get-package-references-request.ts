export class GetPackageReferencesRequest {
    public readonly packageId: string;

    public constructor(init: { packageId: string }) {
        this.packageId = init.packageId;
    }
}
