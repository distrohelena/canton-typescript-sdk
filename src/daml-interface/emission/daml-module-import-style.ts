/** Selects the relative module specifier format emitted for generated DAML projects. */
export class DamlModuleImportStyles {
    public static readonly esm = "esm";
    public static readonly tsNode = "ts-node";

    private constructor() {}
}

export type DamlModuleImportStyle = "esm" | "ts-node";
