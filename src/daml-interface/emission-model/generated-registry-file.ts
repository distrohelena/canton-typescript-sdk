export class GeneratedRegistryFile {
    public readonly path: string;
    public readonly contents: string;

    public constructor(init: { path: string; contents: string }) {
        this.path = init.path;
        this.contents = init.contents;
    }
}
