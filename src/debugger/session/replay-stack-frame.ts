export class ReplayStackFrame {
    public readonly frameId?: string;
    public readonly name?: string;

    public constructor(init?: { frameId?: string; name?: string }) {
        this.frameId = init?.frameId;
        this.name = init?.name;
    }
}
