import { DamlLfValueDefinition } from "../model/daml-lf-value-definition.js";
import { DamlLfLexicalScope } from "./daml-lf-lexical-scope.js";

export class DamlLfRuntimeFrame {
    public readonly frameId: string;
    public readonly packageId: string;
    public readonly moduleName: string;
    public readonly definition: DamlLfValueDefinition;
    public readonly scope: DamlLfLexicalScope;

    public constructor(init: {
        frameId: string;
        packageId: string;
        moduleName: string;
        definition: DamlLfValueDefinition;
        scope?: DamlLfLexicalScope;
    }) {
        this.frameId = init.frameId;
        this.packageId = init.packageId;
        this.moduleName = init.moduleName;
        this.definition = init.definition;
        this.scope = init.scope ?? new DamlLfLexicalScope();
    }
}
