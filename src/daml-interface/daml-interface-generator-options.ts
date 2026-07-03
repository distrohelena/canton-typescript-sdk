export class DamlInterfaceGeneratorOptions {
    public readonly generatedDirectory: string;

    public constructor(init: { generatedDirectory?: string } = {}) {
        this.generatedDirectory = init.generatedDirectory ?? "generated";
    }
}
