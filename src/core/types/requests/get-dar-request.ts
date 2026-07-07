export class GetDarRequest {
    public readonly mainPackageId: string;

    public constructor(init: {
        mainPackageId: string;
    }) {
        this.mainPackageId = init.mainPackageId;
    }
}
