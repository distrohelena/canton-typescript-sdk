import { DamlLfDataType } from "../model/daml-lf-data-type.js";
import { DamlLfSymbol } from "./daml-lf-symbol.js";

export class TypeSymbol extends DamlLfSymbol {
    public readonly definition: DamlLfDataType;

    public constructor(init: { name: string; definition: DamlLfDataType }) {
        super({
            name: init.name,
        });
        this.definition = init.definition;
    }
}
