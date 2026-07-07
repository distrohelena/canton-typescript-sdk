import { ParticipantDarDescription } from "../participant-dar-description.js";
import { ParticipantPackageDescription } from "../participant-package-description.js";

export class GetDarContentsResponse {
    public readonly description?: ParticipantDarDescription;
    public readonly packages: readonly ParticipantPackageDescription[];

    public constructor(init?: {
        description?: ParticipantDarDescription;
        packages?: readonly ParticipantPackageDescription[];
    }) {
        this.description = init?.description;
        this.packages = init?.packages ?? [];
    }
}
