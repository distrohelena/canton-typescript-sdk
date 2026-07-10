import { IDamlLfRuntimeValue } from "./daml-lf-runtime-value.js";

export class DamlLfLexicalScope {
    private readonly bindings = new Map<string, IDamlLfRuntimeValue>();

    public constructor(private readonly parent?: DamlLfLexicalScope) {}

    public getBinding(name: string): IDamlLfRuntimeValue | undefined {
        return this.bindings.get(name) ?? this.parent?.getBinding(name);
    }

    public setBinding(name: string, value: IDamlLfRuntimeValue): void {
        this.bindings.set(name, value);
    }
}
