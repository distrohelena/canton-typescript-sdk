export class DarSourceFileEntry {
    public readonly path: string;
    public readonly content: string;

    public constructor(init: { path: string; content: string }) {
        this.path = init.path;
        this.content = init.content;
    }
}
