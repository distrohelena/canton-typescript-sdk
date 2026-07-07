import { KnownPackageDetails } from "../known-package-details.js";

export class ListKnownPackagesResponse {
    public readonly packageDetails: readonly KnownPackageDetails[];

    public constructor(init: {
        packageDetails: readonly KnownPackageDetails[];
    }) {
        this.packageDetails = init.packageDetails;
    }
}
