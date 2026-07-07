import { PruningSchedule } from "../pruning-schedule.js";

export class GetPruningScheduleResponse {
    public readonly schedule?: PruningSchedule;

    public constructor(init?: {
        schedule?: PruningSchedule;
    }) {
        this.schedule = init?.schedule;
    }
}
