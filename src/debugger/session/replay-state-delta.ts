export class ReplayStateDelta {
    public readonly kind?: string;

    public constructor(init?: { kind?: string }) {
        this.kind = init?.kind;
    }
}
