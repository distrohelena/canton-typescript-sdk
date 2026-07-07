import { PruningSchedule } from "./pruning-schedule.js";

export class ParticipantPruningSchedule {
    public readonly schedule?: PruningSchedule;
    public readonly pruneInternallyOnly: boolean;

    public constructor(init?: {
        schedule?: PruningSchedule;
        pruneInternallyOnly?: boolean;
    }) {
        this.schedule = init?.schedule;
        this.pruneInternallyOnly = init?.pruneInternallyOnly ?? false;
    }
}
