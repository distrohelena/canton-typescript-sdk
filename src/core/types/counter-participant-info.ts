import { TopologyDuration } from "./topology/topology-duration.js";

export class CounterParticipantInfo {
    public readonly counterParticipantUid: string;
    public readonly synchronizerId: string;
    public readonly intervalsBehind: string;
    public readonly behindSince?: TopologyDuration;
    public readonly asOfSequencingTimestamp?: Date;

    public constructor(init: {
        counterParticipantUid: string;
        synchronizerId: string;
        intervalsBehind: string;
        behindSince?: TopologyDuration;
        asOfSequencingTimestamp?: Date;
    }) {
        this.counterParticipantUid = init.counterParticipantUid;
        this.synchronizerId = init.synchronizerId;
        this.intervalsBehind = init.intervalsBehind;
        this.behindSince = init.behindSince;
        this.asOfSequencingTimestamp = init.asOfSequencingTimestamp;
    }
}
