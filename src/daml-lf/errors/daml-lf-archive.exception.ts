export class DamlLfArchiveException extends Error {
    public constructor(message: string) {
        super(message);
        this.name = "DamlLfArchiveException";
    }
}
