export abstract class DamlLfSymbol {
    public readonly name: string;

    protected constructor(init: { name: string }) {
        this.name = init.name;
    }
}
