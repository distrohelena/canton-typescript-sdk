/** A generated module containing declarations for one DAML package/module identity. */
export class GeneratedNamedTypeFile {
    public readonly path: string;
    public readonly contents: string;
    public readonly packageId: string;
    public readonly moduleName: string;
    public readonly namespaceAlias: string;
    public readonly exportedTypeNames: readonly string[];
    /** Resolved exported type names keyed by package, module, and DAML entity name. */
    public readonly exportedTypeNamesByIdentity: ReadonlyMap<string, string>;
    /** Resolved record property names keyed by named type identity, field label, and position. */
    public readonly fieldPropertyNames: ReadonlyMap<string, string>;

    public constructor(init: {
        path: string;
        contents: string;
        packageId: string;
        moduleName: string;
        namespaceAlias: string;
        exportedTypeNames: readonly string[];
        exportedTypeNamesByIdentity?: ReadonlyMap<string, string>;
        fieldPropertyNames?: ReadonlyMap<string, string>;
    }) {
        this.path = init.path;
        this.contents = init.contents;
        this.packageId = init.packageId;
        this.moduleName = init.moduleName;
        this.namespaceAlias = init.namespaceAlias;
        this.exportedTypeNames = init.exportedTypeNames;
        this.exportedTypeNamesByIdentity = init.exportedTypeNamesByIdentity ?? new Map();
        this.fieldPropertyNames = init.fieldPropertyNames ?? new Map();
    }
}
