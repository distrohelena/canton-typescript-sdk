import { ParticipantDarDescription } from "../participant-dar-description.js";

export class GetDarResponse {
    public readonly payload: Uint8Array;
    public readonly data?: ParticipantDarDescription;

    public constructor(init?: {
        payload?: Uint8Array;
        data?: ParticipantDarDescription;
    }) {
        this.payload = init?.payload ?? new Uint8Array();
        this.data = init?.data;
    }
}
