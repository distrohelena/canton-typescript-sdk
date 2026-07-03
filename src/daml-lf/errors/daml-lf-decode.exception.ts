export class DamlLfDecodeException extends Error {
    public constructor(message: string) {
        super(message);
        this.name = "DamlLfDecodeException";
    }
}
