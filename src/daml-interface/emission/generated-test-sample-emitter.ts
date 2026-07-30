import { DamlLfBuiltinType } from "../../daml-lf/model/daml-lf-builtin-type.js";
import { TypeConReference } from "../../daml-lf/model/type-con-reference.js";
import { AnalyzedDamlType } from "../analysis/analyzed-daml-type.js";
import { AnalyzedDamlTypeDefinition } from "../analysis/analyzed-daml-type-definition.js";
import { DamlInterfaceUnsupportedShapeException } from "../errors/daml-interface-unsupported-shape.exception.js";
import { GeneratedNamedTypeFile } from "../emission-model/generated-named-type-file.js";

type GeneratedTestSampleImport = {
    readonly modulePath: string;
    readonly exportedName: string;
    readonly localName: string;
    readonly typeOnly: boolean;
};

/** Collects generated-test dependencies while assigning deterministic collision-safe local names. */
class GeneratedTestSampleImportCollector {
    private readonly importsByKey = new Map<string, GeneratedTestSampleImport>();
    private readonly localNames = new Set<string>();

    public constructor(imports: readonly GeneratedTestSampleImport[] = []) {
        for (const entry of imports) {
            this.importsByKey.set(
                `${entry.modulePath}\u0000${entry.exportedName}\u0000${entry.typeOnly ? "type" : "value"}`,
                entry,
            );
            this.localNames.add(entry.localName);
        }
    }

    public get imports(): readonly GeneratedTestSampleImport[] {
        return [...this.importsByKey.values()].sort((left, right) =>
            left.modulePath.localeCompare(right.modulePath)
            || left.exportedName.localeCompare(right.exportedName));
    }

    /** Reserves local identifiers already declared by the generated spec module. */
    public reserveLocalNames(names: readonly string[]): void {
        for (const name of names) {
            this.localNames.add(name);
        }
    }

    public addRuntime(exportedName: string): string {
        return this.add("@distrohelena/canton-typescript-sdk/daml-interface", exportedName, exportedName, false);
    }

    public addNamedType(file: GeneratedNamedTypeFile, exportedName: string): string {
        return this.add(file.path, exportedName, exportedName, true, file.namespaceAlias);
    }

    private add(
        modulePath: string,
        exportedName: string,
        preferredLocalName: string,
        typeOnly: boolean,
        namespaceAlias = "GeneratedType",
    ): string {
        const key = `${modulePath}\u0000${exportedName}\u0000${typeOnly ? "type" : "value"}`;

        const existing = this.importsByKey.get(key);

        if (existing !== undefined) {
            return existing.localName;
        }

        let localName = preferredLocalName;

        let suffix = 2;

        if (this.localNames.has(localName)) {
            localName = `${namespaceAlias}${exportedName}`;
        }

        while (this.localNames.has(localName)) {
            localName = `${namespaceAlias}${exportedName}_${suffix}`;
            suffix += 1;
        }

        this.localNames.add(localName);
        this.importsByKey.set(key, {
            modulePath,
            exportedName,
            localName,
            typeOnly,
        });

        return localName;
    }
}

/** Immutable inputs used to synthesize a representative generated test value. */
export type GeneratedTestSampleContext = {
    readonly definitions: readonly AnalyzedDamlTypeDefinition[];
    readonly namedTypeFiles: readonly GeneratedNamedTypeFile[];
    readonly path?: readonly string[];
    readonly maximumDepth?: number;
    readonly typeVariableBindings?: ReadonlyMap<string, AnalyzedDamlType>;
};

type Representation = "typeScript" | "ledger";

type SampleState = {
    readonly representation: Representation;
    readonly definitionIndex: ReadonlyMap<string, AnalyzedDamlTypeDefinition>;
    readonly namedTypeFiles: readonly GeneratedNamedTypeFile[];
    readonly imports?: GeneratedTestSampleImportCollector;
    readonly path: readonly string[];
    readonly depth: number;
    readonly bindings: ReadonlyMap<string, AnalyzedDamlType>;
    readonly activeReferences: ReadonlySet<string>;
};

/** Emits deterministic, finite TypeScript and ledger JSON source expressions for analyzed DAML values. */
export class GeneratedTestSampleEmitter {
    private static readonly defaultMaximumDepth = 2;

    private constructor() {}

    public static emitTypeScriptExpressionOrThrow(
        type: AnalyzedDamlType,
        context: GeneratedTestSampleContext,
    ): string {
        return this.emitOrThrow(type, context, "typeScript");
    }

    public static emitLedgerExpressionOrThrow(
        type: AnalyzedDamlType,
        context: GeneratedTestSampleContext,
    ): string {
        return this.emitOrThrow(type, context, "ledger");
    }

    /** Emits a TypeScript sample with its immutable, collision-safe import requirements. */
    public static emitTypeScriptExpressionWithImportsOrThrow(
        type: AnalyzedDamlType,
        context: GeneratedTestSampleContext,
        options: {
            readonly imports?: readonly {
                readonly modulePath: string;
                readonly exportedName: string;
                readonly localName: string;
                readonly typeOnly: boolean;
            }[];
            readonly reservedLocalNames?: readonly string[];
        } = {},
    ): {
        readonly expression: string;
        readonly imports: readonly {
            readonly modulePath: string;
            readonly exportedName: string;
            readonly localName: string;
            readonly typeOnly: boolean;
        }[];
    } {
        const imports = new GeneratedTestSampleImportCollector(options.imports);

        imports.reserveLocalNames(options.reservedLocalNames ?? []);

        return {
            expression: this.emitOrThrow(type, context, "typeScript", imports),
            imports: imports.imports,
        };
    }

    private static emitOrThrow(
        type: AnalyzedDamlType,
        context: GeneratedTestSampleContext,
        representation: Representation,
        imports?: GeneratedTestSampleImportCollector,
    ): string {
        const bindings = context.typeVariableBindings ?? new Map<string, AnalyzedDamlType>();

        return this.emit(type, {
            representation,
            definitionIndex: this.createDefinitionIndex(context.definitions),
            namedTypeFiles: context.namedTypeFiles,
            imports,
            path: context.path ?? ["value"],
            depth: context.maximumDepth ?? this.defaultMaximumDepth,
            bindings,
            activeReferences: new Set(),
        });
    }

    private static emit(type: AnalyzedDamlType, state: SampleState): string {
        if (state.depth <= 0) {
            const finite = this.emitFinite(type, state, new Set());

            if (finite !== undefined) {
                return finite;
            }

            throw this.uninhabitable(state.path, type);
        }

        switch (type.kind) {
            case "primitive":
                return this.emitPrimitive(type.builtinType, type.numericScale, state);
            case "contractId":
                return '"#sample-contract-id"';
            case "optional":
                return state.representation === "ledger" ? "null" : "undefined";
            case "list":
                return `[${this.emit(type.element, this.descend(state, "[0]"))}]`;
            case "textMap":
                return state.representation === "ledger"
                    ? `{ "sample-key": ${this.emit(type.value, this.descend(state, "sample-key"))} }`
                    : `new Map([["sample-key", ${this.emit(type.value, this.descend(state, "sample-key"))}]])`;
            case "genMap": {
                const entry = `[${this.emit(type.key, this.descend(state, "[0].key"))}, ${this.emit(type.value, this.descend(state, "[0].value"))}]`;

                return state.representation === "ledger" ? `[${entry}]` : `new Map([${entry}])`;
            }
            case "record":
                return this.emitRecord(type.fields, state);
            case "variant":
                return this.emitVariant(type.constructors, state);
            case "enum":
                return JSON.stringify(type.constructors[0]);
            case "typeVariable":
                return this.emitTypeVariable(type, state);
            case "namedReference":
                return this.emitNamedReference(type, state);
        }
    }

    private static emitFinite(
        type: AnalyzedDamlType,
        state: SampleState,
        visitedReferences: ReadonlySet<string>,
    ): string | undefined {
        switch (type.kind) {
            case "primitive":
                return this.emitPrimitive(type.builtinType, type.numericScale, state);
            case "contractId":
                return '"#sample-contract-id"';
            case "optional":
                return state.representation === "ledger" ? "null" : "undefined";
            case "list":
                return "[]";
            case "textMap":
                return state.representation === "ledger" ? "{}" : "new Map()";
            case "genMap":
                return state.representation === "ledger" ? "[]" : "new Map()";
            case "record": {
                const fields: string[] = [];

                for (const field of type.fields) {
                    const value = this.emitFinite(field.type, this.descend(state, field.propertyName), visitedReferences);

                    if (value === undefined) {
                        return undefined;
                    }

                    fields.push(this.emitObjectProperty(
                        state.representation === "ledger" ? field.damlLabel : field.propertyName,
                        value,
                    ));
                }

                return `{ ${fields.join(", ")} }`;
            }
            case "variant": {
                for (const constructor of type.constructors) {
                    const payload = this.emitFinite(constructor.payload, this.descend(state, constructor.constructor), visitedReferences);

                    if (payload !== undefined) {
                        return `{ tag: ${JSON.stringify(constructor.constructor)}, value: ${payload} }`;
                    }
                }

                return undefined;
            }
            case "enum":
                return type.constructors.length === 0 ? undefined : JSON.stringify(type.constructors[0]);
            case "typeVariable": {
                const binding = state.bindings.get(this.typeVariableKey(type));

                return binding === undefined ? undefined : this.emitFinite(binding, state, visitedReferences);
            }
            case "namedReference": {
                const referenceKey = this.referenceKey(type.identity, type.typeArguments, state.bindings);

                if (visitedReferences.has(referenceKey)) {
                    return undefined;
                }

                const definition = state.definitionIndex.get(this.identityKey(type.identity));

                if (definition === undefined) {
                    return '"#sample-contract-id"';
                }

                const namedState = this.withDefinitionBindings(definition, type.typeArguments, state);

                const nextVisited = new Set(visitedReferences);

                nextVisited.add(referenceKey);

                const structural = this.emitFiniteDefinition(definition, namedState, nextVisited);

                if (structural === undefined || state.representation === "ledger") {
                    return structural;
                }

                return this.wrapNamedTypeSample(type.identity, type.typeArguments, structural, namedState);
            }
        }
    }

    private static emitPrimitive(
        builtinType: DamlLfBuiltinType,
        numericScale: number | undefined,
        state: SampleState,
    ): string {
        switch (builtinType) {
            case DamlLfBuiltinType.unit:
                if (state.representation === "ledger") {
                    return "{}";
                }

                return `new ${state.imports?.addRuntime("DamlUnit") ?? "DamlUnit"}()`;
            case DamlLfBuiltinType.bool:
                return "true";
            case DamlLfBuiltinType.int64:
                return state.representation === "ledger" ? '"1"' : "1n";
            case DamlLfBuiltinType.date:
                if (state.representation === "ledger") {
                    return "1";
                }

                return `new ${state.imports?.addRuntime("DamlDate") ?? "DamlDate"}(1)`;
            case DamlLfBuiltinType.timestamp:
                if (state.representation === "ledger") {
                    return '"1000000"';
                }

                return `new ${state.imports?.addRuntime("DamlTimestamp") ?? "DamlTimestamp"}("1000000")`;
            case DamlLfBuiltinType.numeric: {
                const numeric = numericScale === undefined || numericScale === 0
                    ? "1"
                    : `1.${"0".repeat(numericScale)}`;

                if (state.representation === "ledger") {
                    return JSON.stringify(numeric);
                }

                return `new ${state.imports?.addRuntime("DamlNumeric") ?? "DamlNumeric"}(${JSON.stringify(numeric)})`;
            }
            case DamlLfBuiltinType.party:
                if (state.representation === "ledger") {
                    return '"Alice"';
                }

                return `new ${state.imports?.addRuntime("DamlParty") ?? "DamlParty"}("Alice")`;
            case DamlLfBuiltinType.text:
                return '"sample text"';
            default:
                throw new DamlInterfaceUnsupportedShapeException(
                    `Cannot synthesize a generated test sample for unsupported primitive '${builtinType}' at ${state.path.join(".")}`,
                );
        }
    }

    private static emitRecord(
        fields: readonly { readonly damlLabel: string; readonly propertyName: string; readonly type: AnalyzedDamlType }[],
        state: SampleState,
    ): string {
        return `{ ${fields.map((field) => this.emitObjectProperty(
            state.representation === "ledger" ? field.damlLabel : field.propertyName,
            this.emit(field.type, this.descend(state, field.propertyName)),
        )).join(", ")} }`;
    }

    private static emitVariant(
        constructors: readonly { readonly constructor: string; readonly payload: AnalyzedDamlType }[],
        state: SampleState,
    ): string {
        const constructor = constructors[0];

        if (constructor === undefined) {
            throw this.uninhabitable(state.path, { kind: "variant", constructors });
        }

        return `{ tag: ${JSON.stringify(constructor.constructor)}, value: ${this.emit(constructor.payload, this.descend(state, constructor.constructor))} }`;
    }

    private static emitTypeVariable(
        type: Extract<AnalyzedDamlType, { readonly kind: "typeVariable" }>,
        state: SampleState,
    ): string {
        const binding = state.bindings.get(this.typeVariableKey(type));

        if (binding === undefined) {
            throw new DamlInterfaceUnsupportedShapeException(
                `Cannot synthesize a generated test sample for unbound type variable '${type.name ?? type.internedStringIndex}' at ${state.path.join(".")}`,
            );
        }

        return this.emit(binding, state);
    }

    private static emitNamedReference(
        type: Extract<AnalyzedDamlType, { readonly kind: "namedReference" }>,
        state: SampleState,
    ): string {
        const referenceKey = this.referenceKey(type.identity, type.typeArguments, state.bindings);

        if (state.activeReferences.has(referenceKey)) {
            const finite = this.emitFinite(type, state, new Set());

            if (finite !== undefined) {
                return finite;
            }

            throw this.uninhabitable(state.path, type);
        }

        const definition = state.definitionIndex.get(this.identityKey(type.identity));

        if (definition === undefined) {
            return '"#sample-contract-id"';
        }

        const namedState = this.withDefinitionBindings(definition, type.typeArguments, {
            ...state,
            depth: state.depth - 1,
            activeReferences: new Set([...state.activeReferences, referenceKey]),
        });

        if (namedState.depth <= 0) {
            const finite = this.emitFinite(type, state, new Set());

            if (finite === undefined) {
                throw this.uninhabitable(state.path, type);
            }

            return finite;
        }

        const structural = this.emitDefinition(definition, namedState);

        return state.representation === "ledger"
            ? structural
            : this.wrapNamedTypeSample(type.identity, type.typeArguments, structural, namedState);
    }

    private static wrapNamedTypeSample(
        identity: TypeConReference,
        typeArguments: readonly AnalyzedDamlType[],
        structural: string,
        state: SampleState,
    ): string {
        const file = state.namedTypeFiles.find((candidate) =>
            candidate.packageId === identity.packageId && candidate.moduleName === identity.moduleName);

        const exportedName = file?.exportedTypeNamesByIdentity.get(this.identityKey(identity));

        if (file === undefined || exportedName === undefined) {
            return structural;
        }

        const localName = state.imports?.addNamedType(file, exportedName) ?? exportedName;

        const parameters = typeArguments.map((argument) => this.emitTypeName(argument, state));

        const appliedName = parameters.length === 0 ? localName : `${localName}<${parameters.join(", ")}>`;

        return `(${structural} satisfies ${appliedName})`;
    }

    private static emitDefinition(definition: AnalyzedDamlTypeDefinition, state: SampleState): string {
        if (definition.kind === "record") {
            return `{ ${definition.fields.map((field, index) => this.emitObjectProperty(
                state.representation === "ledger"
                    ? field.damlLabel
                    : this.getRecordPropertyName(definition, index, field.propertyName, state),
                this.emit(field.type, this.descend(state, field.propertyName)),
            )).join(", ")} }`;
        } else if (definition.kind === "variant") {
            return this.emitVariant(definition.constructors, state);
        }

        return JSON.stringify(definition.constructors[0]);
    }

    private static emitFiniteDefinition(
        definition: AnalyzedDamlTypeDefinition,
        state: SampleState,
        visitedReferences: ReadonlySet<string>,
    ): string | undefined {
        if (definition.kind !== "record") {
            return this.emitFinite(definition, state, visitedReferences);
        }

        const fields: string[] = [];

        for (const [index, field] of definition.fields.entries()) {
            const value = this.emitFinite(field.type, this.descend(state, field.propertyName), visitedReferences);

            if (value === undefined) {
                return undefined;
            }

            fields.push(this.emitObjectProperty(
                state.representation === "ledger"
                    ? field.damlLabel
                    : this.getRecordPropertyName(definition, index, field.propertyName, state),
                value,
            ));
        }

        return `{ ${fields.join(", ")} }`;
    }

    private static emitTypeName(type: AnalyzedDamlType, state: SampleState): string {
        switch (type.kind) {
            case "primitive":
                switch (type.builtinType) {
                    case DamlLfBuiltinType.unit:
                        return state.imports?.addRuntime("DamlUnit") ?? "DamlUnit";
                    case DamlLfBuiltinType.bool: return "boolean";
                    case DamlLfBuiltinType.int64: return "bigint";
                    case DamlLfBuiltinType.date:
                        return state.imports?.addRuntime("DamlDate") ?? "DamlDate";
                    case DamlLfBuiltinType.timestamp:
                        return state.imports?.addRuntime("DamlTimestamp") ?? "DamlTimestamp";
                    case DamlLfBuiltinType.numeric:
                        return state.imports?.addRuntime("DamlNumeric") ?? "DamlNumeric";
                    case DamlLfBuiltinType.party:
                        return state.imports?.addRuntime("DamlParty") ?? "DamlParty";
                    case DamlLfBuiltinType.text: return "string";
                    default: throw this.uninhabitable(state.path, type);
                }
            case "contractId": return "string";
            case "optional": return `${this.emitTypeName(type.element, state)} | undefined`;
            case "list": return `readonly ${this.emitTypeName(type.element, state)}[]`;
            case "textMap": return `ReadonlyMap<string, ${this.emitTypeName(type.value, state)}>`;
            case "genMap": return `ReadonlyMap<${this.emitTypeName(type.key, state)}, ${this.emitTypeName(type.value, state)}>`;
            case "typeVariable": {
                const binding = state.bindings.get(this.typeVariableKey(type));

                return binding === undefined ? "unknown" : this.emitTypeName(binding, state);
            }
            case "namedReference": {
                const definition = state.definitionIndex.get(this.identityKey(type.identity));

                const definitionState = definition === undefined
                    ? state
                    : this.withDefinitionBindings(definition, type.typeArguments, state);

                const file = state.namedTypeFiles.find((candidate) =>
                    candidate.packageId === type.identity.packageId && candidate.moduleName === type.identity.moduleName);

                const exportedName = file?.exportedTypeNamesByIdentity.get(this.identityKey(type.identity));

                if (file === undefined || exportedName === undefined) {
                    return "string";
                }

                const localName = state.imports?.addNamedType(file, exportedName) ?? exportedName;

                const argumentsText = type.typeArguments.map((argument) => this.emitTypeName(argument, definitionState));

                return argumentsText.length === 0 ? localName : `${localName}<${argumentsText.join(", ")}>`;
            }
            case "record":
            case "variant":
            case "enum":
                return "unknown";
        }
    }

    private static withDefinitionBindings(
        definition: AnalyzedDamlTypeDefinition,
        typeArguments: readonly AnalyzedDamlType[],
        state: SampleState,
    ): SampleState {
        const parameters = "typeParameters" in definition ? definition.typeParameters : [];

        if (parameters.length !== typeArguments.length) {
            throw new DamlInterfaceUnsupportedShapeException(
                `Cannot synthesize a generated test sample for ${this.describeIdentity(definition.identity)}: expected ${parameters.length} type arguments but received ${typeArguments.length} at ${state.path.join(".")}`,
            );
        }

        const bindings = new Map(state.bindings);

        parameters.forEach((parameter, index) => bindings.set(
            this.typeVariableKey(parameter),
            this.resolveTypeVariables(typeArguments[index], state.bindings),
        ));

        return { ...state, bindings };
    }

    private static resolveTypeVariables(type: AnalyzedDamlType, bindings: ReadonlyMap<string, AnalyzedDamlType>): AnalyzedDamlType {
        if (type.kind === "typeVariable") {
            return bindings.get(this.typeVariableKey(type)) ?? type;
        }

        switch (type.kind) {
            case "optional":
                return { ...type, element: this.resolveTypeVariables(type.element, bindings) };
            case "list":
                return { ...type, element: this.resolveTypeVariables(type.element, bindings) };
            case "textMap":
                return { ...type, value: this.resolveTypeVariables(type.value, bindings) };
            case "genMap":
                return {
                    ...type,
                    key: this.resolveTypeVariables(type.key, bindings),
                    value: this.resolveTypeVariables(type.value, bindings),
                };
            case "record":
                return {
                    ...type,
                    fields: type.fields.map((field) => ({
                        ...field,
                        type: this.resolveTypeVariables(field.type, bindings),
                    })),
                };
            case "variant":
                return {
                    ...type,
                    constructors: type.constructors.map((constructor) => ({
                        ...constructor,
                        payload: this.resolveTypeVariables(constructor.payload, bindings),
                    })),
                };
            case "namedReference":
                return {
                    ...type,
                    typeArguments: type.typeArguments.map((argument) => this.resolveTypeVariables(argument, bindings)),
                };
            case "primitive":
            case "contractId":
            case "enum":
                return type;
        }
    }

    private static descend(state: SampleState, segment: string): SampleState {
        return {
            ...state,
            path: [...state.path, segment],
            depth: state.depth - 1,
        };
    }

    private static createDefinitionIndex(definitions: readonly AnalyzedDamlTypeDefinition[]): ReadonlyMap<string, AnalyzedDamlTypeDefinition> {
        return new Map(definitions.map((definition) => [this.identityKey(definition.identity), definition]));
    }

    private static getRecordPropertyName(
        definition: AnalyzedDamlTypeDefinition,
        index: number,
        fallback: string,
        state: SampleState,
    ): string {
        const file = state.namedTypeFiles.find((candidate) =>
            candidate.packageId === definition.identity.packageId && candidate.moduleName === definition.identity.moduleName);

        const key = `${this.identityKey(definition.identity)}\u0000field\u0000${index}`;

        return file?.fieldPropertyNames.get(key) ?? fallback;
    }

    private static emitObjectProperty(name: string, value: string): string {
        const propertyName = /^[A-Za-z_$][A-Za-z0-9_$]*$/u.test(name)
            ? name
            : JSON.stringify(name);

        return `${propertyName}: ${value}`;
    }

    private static typeVariableKey(type: { readonly name?: string; readonly internedStringIndex: number }): string {
        return type.name === undefined ? `#${type.internedStringIndex}` : `${type.name}\u0000${type.internedStringIndex}`;
    }

    private static identityKey(identity: TypeConReference): string {
        return `${identity.packageId}\u0000${identity.moduleName}\u0000${identity.name}`;
    }

    private static referenceKey(
        identity: TypeConReference,
        typeArguments: readonly AnalyzedDamlType[],
        bindings: ReadonlyMap<string, AnalyzedDamlType>,
    ): string {
        return `${this.identityKey(identity)}<${typeArguments.map((argument) => this.typeFingerprint(argument, bindings)).join(",")}>`;
    }

    private static typeFingerprint(type: AnalyzedDamlType, bindings: ReadonlyMap<string, AnalyzedDamlType>): string {
        if (type.kind === "typeVariable") {
            const resolved = bindings.get(this.typeVariableKey(type));

            return resolved === undefined ? this.typeVariableKey(type) : this.typeFingerprint(resolved, bindings);
        } else if (type.kind === "namedReference") {
            return `${this.identityKey(type.identity)}<${type.typeArguments.map((argument) => this.typeFingerprint(argument, bindings)).join(",")}>`;
        }

        return type.kind === "primitive"
            ? `${type.kind}:${type.builtinType}:${type.numericScale ?? ""}`
            : type.kind;
    }

    private static uninhabitable(path: readonly string[], type: AnalyzedDamlType): DamlInterfaceUnsupportedShapeException {
        const identity = type.kind === "namedReference" ? this.describeIdentity(type.identity) : "the reachable DAML value";

        return new DamlInterfaceUnsupportedShapeException(
            `Cannot synthesize a finite generated test sample for ${identity} at ${path.join(".")}`,
        );
    }

    private static describeIdentity(identity: TypeConReference): string {
        return `${identity.packageId}:${identity.moduleName}:${identity.name}`;
    }
}
