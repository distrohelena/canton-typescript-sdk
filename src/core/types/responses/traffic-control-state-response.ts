import { TrafficState } from "../traffic-state.js";

export class TrafficControlStateResponse {
    public readonly trafficState?: TrafficState;

    public constructor(init?: {
        trafficState?: TrafficState;
    }) {
        this.trafficState = init?.trafficState;
    }
}
