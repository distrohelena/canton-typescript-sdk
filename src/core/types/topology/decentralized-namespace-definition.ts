export class DecentralizedNamespaceDefinition {
    public readonly decentralizedNamespace: string;
    public readonly threshold: number;
    public readonly owners: string[];

    public constructor(init: {
        decentralizedNamespace: string;
        threshold: number;
        owners?: string[];
    }) {
        this.decentralizedNamespace = init.decentralizedNamespace;
        this.threshold = init.threshold;
        this.owners = [...(init.owners ?? [])];
    }
}
