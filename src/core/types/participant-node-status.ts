import { AdminComponentStatus } from "./admin-component-status.js";
import { AdminNodeStatus } from "./admin-node-status.js";
import { AdminTopologyQueueStatus } from "./admin-topology-queue-status.js";
import { ConnectedSynchronizerStatus } from "./connected-synchronizer-status.js";

export class ParticipantNodeStatus extends AdminNodeStatus {
    public readonly connectedSynchronizers: ConnectedSynchronizerStatus[];
    public readonly supportedProtocolVersions: number[];

    public constructor(init: {
        uid: string;
        uptime?: {
            seconds: string;
            nanos: number;
        };
        ports: Record<string, number>;
        active: boolean;
        topologyQueues?: AdminTopologyQueueStatus;
        components: AdminComponentStatus[];
        version: string;
        connectedSynchronizers: ConnectedSynchronizerStatus[];
        supportedProtocolVersions: number[];
    }) {
        super({
            uid: init.uid,
            uptime: init.uptime,
            ports: init.ports,
            active: init.active,
            topologyQueues: init.topologyQueues,
            components: init.components,
            version: init.version,
        });

        this.connectedSynchronizers = init.connectedSynchronizers;
        this.supportedProtocolVersions = init.supportedProtocolVersions;
    }
}
