import { DamlLfModule } from "../model/daml-lf-module.js";
import { DamlLfSymbol } from "./daml-lf-symbol.js";

export class ModuleSymbol extends DamlLfSymbol {
    public readonly module: DamlLfModule;

    public constructor(init: { name: string; module: DamlLfModule }) {
        super({
            name: init.name,
        });
        this.module = init.module;
    }
}
