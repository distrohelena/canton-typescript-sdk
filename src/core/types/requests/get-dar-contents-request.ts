export class GetDarContentsRequest {
    public readonly mainPackageId: string;

    public constructor(init: {
        mainPackageId: string;
    }) {
        this.mainPackageId = init.mainPackageId;
    }
}
