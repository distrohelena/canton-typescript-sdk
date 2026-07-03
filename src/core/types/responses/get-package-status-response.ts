import { PackageStatus } from "../package-status.js";

export class GetPackageStatusResponse {
    public readonly packageStatus: PackageStatus;

    public constructor(init: { packageStatus: PackageStatus }) {
        this.packageStatus = init.packageStatus;
    }
}
