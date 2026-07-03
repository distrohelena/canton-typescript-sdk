import { ParticipantDarDescription } from "../participant-dar-description.js";

export class GetPackageReferencesResponse {
    public readonly dars: ParticipantDarDescription[];

    public constructor(init: { dars: ParticipantDarDescription[] }) {
        this.dars = [...init.dars];
    }
}
