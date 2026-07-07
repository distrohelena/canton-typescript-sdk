import { TopologyDuration } from "./topology/topology-duration.js";

export class PruningSchedule {
    public readonly cron: string;
    public readonly maxDuration?: TopologyDuration;
    public readonly retention?: TopologyDuration;

    public constructor(init?: {
        cron?: string;
        maxDuration?: TopologyDuration;
        retention?: TopologyDuration;
    }) {
        this.cron = init?.cron ?? "";
        this.maxDuration = init?.maxDuration;
        this.retention = init?.retention;
    }
}
