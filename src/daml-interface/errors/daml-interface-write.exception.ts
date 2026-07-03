export class DamlInterfaceWriteException extends Error {
    public constructor(message: string) {
        super(message);
        this.name = "DamlInterfaceWriteException";
    }
}
