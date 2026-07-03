export class DamlLfVersionNotSupportedException extends Error {
    public constructor(message: string) {
        super(message);
        this.name = "DamlLfVersionNotSupportedException";
    }
}
