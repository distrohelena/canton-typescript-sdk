import { RegisteredSynchronizerSequencerConnections } from "./registered-synchronizer-sequencer-connections.js";
import { RegisteredSynchronizerTimeTrackerConfig } from "./registered-synchronizer-time-tracker-config.js";
import { TopologyDuration } from "./topology/topology-duration.js";

export class RegisteredSynchronizerConnectionConfig {
    public readonly synchronizerAlias: string;
    public readonly sequencerConnections?: RegisteredSynchronizerSequencerConnections;
    public readonly manualConnect: boolean;
    public readonly physicalSynchronizerId: string;
    public readonly priority: number;
    public readonly initialRetryDelay?: TopologyDuration;
    public readonly maxRetryDelay?: TopologyDuration;
    public readonly timeTracker?: RegisteredSynchronizerTimeTrackerConfig;
    public readonly initializeFromTrustedSynchronizer: boolean;

    public constructor(init: {
        synchronizerAlias: string;
        sequencerConnections?: RegisteredSynchronizerSequencerConnections;
        manualConnect?: boolean;
        physicalSynchronizerId?: string;
        priority?: number;
        initialRetryDelay?: TopologyDuration;
        maxRetryDelay?: TopologyDuration;
        timeTracker?: RegisteredSynchronizerTimeTrackerConfig;
        initializeFromTrustedSynchronizer?: boolean;
    }) {
        this.synchronizerAlias = init.synchronizerAlias;
        this.sequencerConnections = init.sequencerConnections;
        this.manualConnect = init.manualConnect ?? false;
        this.physicalSynchronizerId = init.physicalSynchronizerId ?? "";
        this.priority = init.priority ?? 0;
        this.initialRetryDelay = init.initialRetryDelay;
        this.maxRetryDelay = init.maxRetryDelay;
        this.timeTracker = init.timeTracker;
        this.initializeFromTrustedSynchronizer =
            init.initializeFromTrustedSynchronizer ?? false;
    }
}
