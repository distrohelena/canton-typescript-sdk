export class GetSafePruningOffsetResponse {
    public readonly hasSafePruningOffset: boolean;
    public readonly safePruningOffset?: string;

    public constructor(init?: {
        hasSafePruningOffset?: boolean;
        safePruningOffset?: string;
    }) {
        this.hasSafePruningOffset = init?.hasSafePruningOffset ?? false;
        this.safePruningOffset = init?.safePruningOffset;
    }
}
