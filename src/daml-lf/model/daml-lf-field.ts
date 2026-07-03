import { DamlLfType } from "./daml-lf-type.js";

export class DamlLfField {
    public readonly name: string;
    public readonly type: DamlLfType;

    public constructor(init: { name: string; type: DamlLfType }) {
        this.name = init.name;
        this.type = init.type;
    }
}
