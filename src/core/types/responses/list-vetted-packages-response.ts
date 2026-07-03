import { VettedPackages } from "../vetted-packages.js";

export class ListVettedPackagesResponse {
    public readonly vettedPackages: VettedPackages[];
    public readonly nextPageToken?: string;

    public constructor(init: {
        vettedPackages: VettedPackages[];
        nextPageToken?: string;
    }) {
        this.vettedPackages = [...init.vettedPackages];
        this.nextPageToken = init.nextPageToken;
    }
}
