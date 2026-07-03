export class DamlLfResolutionException extends Error {
    public constructor(message: string) {
        super(message);
        this.name = "DamlLfResolutionException";
    }
}
