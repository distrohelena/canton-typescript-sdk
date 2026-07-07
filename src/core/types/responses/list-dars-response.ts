import { ParticipantDarDescription } from "../participant-dar-description.js";

export class ListDarsResponse {
    public readonly dars: readonly ParticipantDarDescription[];

    public constructor(init?: {
        dars?: readonly ParticipantDarDescription[];
    }) {
        this.dars = init?.dars ?? [];
    }
}
