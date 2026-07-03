export class GetPackageRequest {
    public readonly packageId: string;

    public constructor(init: { packageId: string }) {
        this.packageId = init.packageId;
    }
}
