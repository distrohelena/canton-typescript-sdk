export class TopologyDuration {
    public readonly seconds: string;
    public readonly nanos: number;

    public constructor(init: {
        seconds?: string;
        nanos?: number;
    } = {}) {
        this.seconds = init.seconds ?? "0";
        this.nanos = init.nanos ?? 0;
    }
}
