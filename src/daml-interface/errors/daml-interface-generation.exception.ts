export class DamlInterfaceGenerationException extends Error {
    public constructor(message: string) {
        super(message);
        this.name = "DamlInterfaceGenerationException";
    }
}
