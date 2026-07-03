import { ParticipantPackageDescription } from "../participant-package-description.js";

export class ParticipantListPackagesResponse {
    public readonly packageDescriptions: ParticipantPackageDescription[];

    public constructor(init: {
        packageDescriptions: ParticipantPackageDescription[];
    }) {
        this.packageDescriptions = [...init.packageDescriptions];
    }
}
