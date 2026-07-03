export class DarPackageEntry {
    public readonly path: string;
    public readonly bytes: Uint8Array;

    public constructor(init: { path: string; bytes: Uint8Array }) {
        this.path = init.path;
        this.bytes = init.bytes;
    }
}
