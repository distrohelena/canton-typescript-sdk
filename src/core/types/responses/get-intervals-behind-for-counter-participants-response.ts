import { CounterParticipantInfo } from "../counter-participant-info.js";

export class GetIntervalsBehindForCounterParticipantsResponse {
    public readonly intervalsBehind: readonly CounterParticipantInfo[];

    public constructor(init: {
        intervalsBehind: readonly CounterParticipantInfo[];
    }) {
        this.intervalsBehind = [...init.intervalsBehind];
    }
}
