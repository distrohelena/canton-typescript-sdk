import { DamlLfResolutionException } from "./errors/daml-lf-resolution.exception.js";
import { DamlLfDataType } from "./model/daml-lf-data-type.js";
import { DamlLfType } from "./model/daml-lf-type.js";
import { DamlLfValueDefinition } from "./model/daml-lf-value-definition.js";
import { ModuleReference } from "./model/module-reference.js";
import { TypeConReference } from "./model/type-con-reference.js";
import { DamlLfSemanticModel } from "./semantics/daml-lf-semantic-model.js";
import { DamlLfWorkspace } from "./daml-lf-workspace.js";
import { ModuleSymbol } from "./symbols/module-symbol.js";
import { TypeSymbol } from "./symbols/type-symbol.js";

export class DamlLfCompilation {
    private readonly moduleSymbols = new Map<string, ModuleSymbol>();
    private readonly typeSymbols = new Map<string, TypeSymbol>();

    private constructor(private readonly workspace: DamlLfWorkspace) {
        void this.workspace;
    }

    public static createOrThrow(workspace: DamlLfWorkspace): DamlLfCompilation {
        const compilation = new DamlLfCompilation(workspace);

        compilation.buildIndexes();
        compilation.validateReferencesOrThrow();

        return compilation;
    }

    public getModuleSymbolOrThrow(reference: ModuleReference): ModuleSymbol {
        const symbol = this.moduleSymbols.get(
            DamlLfCompilation.createModuleKey(
                reference.packageId,
                reference.moduleName,
            ),
        );

        if (symbol === undefined) {
            throw new DamlLfResolutionException(
                `could not resolve module '${reference.moduleName}' in package '${reference.packageId}'`,
            );
        }

        return symbol;
    }

    public getTypeSymbolOrThrow(reference: TypeConReference): TypeSymbol {
        const symbol = this.typeSymbols.get(
            DamlLfCompilation.createTypeKey(
                reference.packageId,
                reference.moduleName,
                reference.name,
            ),
        );

        if (symbol === undefined) {
            throw new DamlLfResolutionException(
                `could not resolve type '${reference.name}' in module '${reference.moduleName}'`,
            );
        }

        return symbol;
    }

    public createSemanticModel(): DamlLfSemanticModel {
        return new DamlLfSemanticModel(this);
    }

    private buildIndexes(): void {
        for (const pkg of this.workspace.packages) {
            for (const module of pkg.modules) {
                this.moduleSymbols.set(
                    DamlLfCompilation.createModuleKey(pkg.packageId, module.name),
                    new ModuleSymbol({
                        name: module.name,
                        module,
                    }),
                );

                for (const definition of module.definitions) {
                    if (definition instanceof DamlLfDataType) {
                        this.typeSymbols.set(
                            DamlLfCompilation.createTypeKey(
                                pkg.packageId,
                                module.name,
                                definition.name,
                            ),
                            new TypeSymbol({
                                name: definition.name,
                                definition,
                            }),
                        );
                    }
                }
            }
        }
    }

    private validateReferencesOrThrow(): void {
        for (const pkg of this.workspace.packages) {
            for (const module of pkg.modules) {
                for (const definition of module.definitions) {
                    if (definition instanceof DamlLfValueDefinition) {
                        this.validateTypeOrThrow(definition.type);
                    }

                    if (definition instanceof DamlLfDataType) {
                        for (const field of definition.fields) {
                            this.validateTypeOrThrow(field.type);
                        }
                    }
                }
            }
        }
    }

    private validateTypeOrThrow(type: DamlLfType): void {
        const reference = type.typeConReference;

        if (reference === undefined) {
            return;
        }

        this.getTypeSymbolOrThrow(reference);
    }

    private static createModuleKey(packageId: string, moduleName: string): string {
        return `${packageId}::${moduleName}`;
    }

    private static createTypeKey(
        packageId: string,
        moduleName: string,
        name: string,
    ): string {
        return `${packageId}::${moduleName}::${name}`;
    }
}
