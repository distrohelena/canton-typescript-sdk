export class ReplayScope {
    public readonly frameId?: string;
    public readonly name?: string;
    public readonly variables: readonly unknown[];

    public constructor(init?: {
        frameId?: string;
        name?: string;
        variables?: readonly unknown[];
    }) {
        this.frameId = init?.frameId;
        this.name = init?.name;
        this.variables = init?.variables ?? [];
    }
}
