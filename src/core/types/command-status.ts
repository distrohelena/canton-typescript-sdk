import { CommandRequestStatistics } from "./command-request-statistics.js";
import { CommandState } from "./command-state.js";
import { CommandTiming } from "./command-timing.js";
import { CommandUpdateSummary } from "./command-update-summary.js";
import { Completion } from "./completion.js";
import { SdkCommand } from "./sdk-command.js";

export class CommandStatus {
    public readonly started?: Date;
    public readonly completed?: Date;
    public readonly completion?: Completion;
    public readonly state: CommandState;
    public readonly commands: readonly SdkCommand[];
    public readonly requestStatistics?: CommandRequestStatistics;
    public readonly updates?: CommandUpdateSummary;
    public readonly synchronizerId?: string;
    public readonly timings: readonly CommandTiming[];

    public constructor(init?: {
        started?: Date;
        completed?: Date;
        completion?: Completion;
        state?: CommandState;
        commands?: readonly SdkCommand[];
        requestStatistics?: CommandRequestStatistics;
        updates?: CommandUpdateSummary;
        synchronizerId?: string;
        timings?: readonly CommandTiming[];
    }) {
        this.started = init?.started;
        this.completed = init?.completed;
        this.completion = init?.completion;
        this.state = init?.state ?? CommandState.unspecified;
        this.commands = init?.commands ?? [];
        this.requestStatistics = init?.requestStatistics;
        this.updates = init?.updates;
        this.synchronizerId = init?.synchronizerId;
        this.timings = init?.timings ?? [];
    }
}
