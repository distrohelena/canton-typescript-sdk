export class ObjectMeta {
    public readonly resourceVersion?: string;
    public readonly annotations?: Record<string, string>;

    public constructor(init?: {
        resourceVersion?: string;
        annotations?: Record<string, string>;
    }) {
        this.resourceVersion = init?.resourceVersion;
        this.annotations = init?.annotations;
    }
}
