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

    public createChild(): DamlLfLexicalScope {
        return new DamlLfLexicalScope(this);
    }

    public snapshotBindings(): readonly {
        name: string;
        value: IDamlLfRuntimeValue;
    }[] {
        const resolved = new Map<string, IDamlLfRuntimeValue>();

        for (const binding of this.parent?.snapshotBindings() ?? []) {
            resolved.set(binding.name, binding.value);
        }

        for (const [name, value] of this.bindings.entries()) {
            resolved.set(name, value);
        }

        return [...resolved.entries()].map(([name, value]) => ({
            name,
            value,
        }));
    }
}
