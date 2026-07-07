import { ParticipantPruningSchedule } from "../participant-pruning-schedule.js";

export class GetParticipantPruningScheduleResponse {
    public readonly schedule?: ParticipantPruningSchedule;

    public constructor(init?: {
        schedule?: ParticipantPruningSchedule;
    }) {
        this.schedule = init?.schedule;
    }
}
