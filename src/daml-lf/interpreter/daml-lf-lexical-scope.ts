import { IDamlLfRuntimeValue } from "./daml-lf-runtime-value.js";

export class DamlLfLexicalScope {
    private readonly bindings = new Map<string, IDamlLfRuntimeValue>();

    public constructor(private readonly parent?: DamlLfLexicalScope) {}

    public getBinding(name: string): IDamlLfRuntimeValue | undefined {
        const visited = new Set<DamlLfLexicalScope>();
        let current: DamlLfLexicalScope | undefined = this;

        while (current !== undefined && !visited.has(current)) {
            visited.add(current);

            const binding = current.bindings.get(name);

            if (binding !== undefined) {
                return binding;
            }

            current = current.parent;
        }

        return undefined;
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
        const scopes: DamlLfLexicalScope[] = [];
        const resolved = new Map<string, IDamlLfRuntimeValue>();
        const visited = new Set<DamlLfLexicalScope>();
        let current: DamlLfLexicalScope | undefined = this;

        while (current !== undefined && !visited.has(current)) {
            visited.add(current);
            scopes.push(current);
            current = current.parent;
        }

        for (let index = scopes.length - 1; index >= 0; index -= 1) {
            for (const [name, value] of scopes[index]!.bindings.entries()) {
                resolved.set(name, value);
            }
        }

        return [...resolved.entries()].map(([name, value]) => ({
            name,
            value,
        }));
    }
}
