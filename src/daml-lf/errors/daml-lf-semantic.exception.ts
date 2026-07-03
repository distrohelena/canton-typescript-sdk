export class DamlLfSemanticException extends Error {
    public constructor(message: string) {
        super(message);
        this.name = "DamlLfSemanticException";
    }
}
