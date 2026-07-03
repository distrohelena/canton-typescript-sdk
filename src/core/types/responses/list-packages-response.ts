export class ListPackagesResponse {
    public readonly packageIds: string[];

    public constructor(init: { packageIds: string[] }) {
        this.packageIds = [...init.packageIds];
    }
}
