export class GetCompletionsRequest {
    public readonly parties: readonly string[];
    public readonly beginExclusive: string;

    public constructor(init: {
        parties?: readonly string[];
        beginExclusive: string;
    }) {
        this.parties = init.parties ?? [];
        this.beginExclusive = init.beginExclusive;
    }
}
