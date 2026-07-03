export class DamlInterfaceUnsupportedShapeException extends Error {
    public constructor(message: string) {
        super(message);
        this.name = "DamlInterfaceUnsupportedShapeException";
    }
}
