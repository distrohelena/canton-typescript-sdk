import { DamlLfDefinition } from "./daml-lf-definition.js";
import { DamlLfNodeKind } from "./daml-lf-node-kind.js";

export class DamlLfModule {
    public readonly nodeKind = DamlLfNodeKind.module;
    public readonly name: string;
    public readonly definitions: readonly DamlLfDefinition[];

    public constructor(init: {
        name: string;
        definitions: readonly DamlLfDefinition[];
    }) {
        this.name = init.name;
        this.definitions = init.definitions;
    }
}
