export class CommandTiming {
    public readonly description: string;
    public readonly durationMs: number;

    public constructor(init: {
        description: string;
        durationMs: number;
    }) {
        this.description = init.description;
        this.durationMs = init.durationMs;
    }
}
