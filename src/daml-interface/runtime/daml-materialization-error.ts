/** Raised when a transport value cannot be materialized as its DAML descriptor. */
export class DamlMaterializationError extends Error {
    public readonly path: string;

    public constructor(path: string, detail: string) {
        super(`${path}: ${detail}`);
        this.name = "DamlMaterializationError";
        this.path = path;
    }
}
