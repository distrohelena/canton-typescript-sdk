import { DamlLfNodeKind } from "./daml-lf-node-kind.js";

export abstract class DamlLfDefinition {
    public abstract readonly nodeKind: DamlLfNodeKind;
    public readonly name: string;

    protected constructor(init: { name: string }) {
        this.name = init.name;
    }
}
