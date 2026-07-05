import { AdminComponentStatus } from "./admin-component-status.js";
import { AdminTopologyQueueStatus } from "./admin-topology-queue-status.js";

export class AdminNodeStatus {
    public readonly uid: string;
    public readonly uptime?: {
        seconds: string;
        nanos: number;
    };
    public readonly ports: Record<string, number>;
    public readonly active: boolean;
    public readonly topologyQueues?: AdminTopologyQueueStatus;
    public readonly components: AdminComponentStatus[];
    public readonly version: string;

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
    }) {
        this.uid = init.uid;
        this.uptime = init.uptime;
        this.ports = init.ports;
        this.active = init.active;
        this.topologyQueues = init.topologyQueues;
        this.components = init.components;
        this.version = init.version;
    }
}
