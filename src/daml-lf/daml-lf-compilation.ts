import { DamlLfResolutionException } from "./errors/daml-lf-resolution.exception.js";
import { DamlLfSemanticException } from "./errors/daml-lf-semantic.exception.js";
import { DamlLfChoice } from "./model/daml-lf-choice.js";
import { DamlLfBuiltinType } from "./model/daml-lf-builtin-type.js";
import { DamlLfDataType } from "./model/daml-lf-data-type.js";
import { DamlLfModule } from "./model/daml-lf-module.js";
import { DamlLfTemplate } from "./model/daml-lf-template.js";
import { DamlLfTemplateId } from "./model/daml-lf-template-id.js";
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
    private readonly templates = new Map<string, DamlLfTemplate>();
    private readonly valueDefinitions = new Map<string, DamlLfValueDefinition>();
    private readonly valueDefinitionIdentities = new Map<
        DamlLfValueDefinition,
        {
            packageId: string;
            moduleName: string;
            definitionName: string;
        }
    >();

    private constructor(private readonly workspace: DamlLfWorkspace) {
        void this.workspace;
    }

    public static createOrThrow(workspace: DamlLfWorkspace): DamlLfCompilation {
        const compilation = new DamlLfCompilation(workspace);

        compilation.buildIndexes();
        compilation.validateReferencesOrThrow();

        return compilation;
    }

    public static createForTemplateGeneration(
        workspace: DamlLfWorkspace,
    ): DamlLfCompilation {
        const compilation = new DamlLfCompilation(workspace);

        compilation.buildIndexes();

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

    public getValueDefinitionOrThrow(
        packageId: string,
        moduleName: string,
        definitionName: string,
    ): DamlLfValueDefinition {
        const definition = this.valueDefinitions.get(
            DamlLfCompilation.createDefinitionKey(
                packageId,
                moduleName,
                definitionName,
            ),
        );

        if (definition === undefined) {
            throw new DamlLfResolutionException(
                `could not resolve value definition '${definitionName}' in module '${moduleName}'`,
            );
        }

        return definition;
    }

    public getModuleOrThrow(packageId: string, moduleName: string): DamlLfModule {
        return this.getModuleSymbolOrThrow(
            new ModuleReference({
                packageId,
                moduleName,
            }),
        ).module;
    }

    public getValueDefinitionIdentityOrThrow(definition: DamlLfValueDefinition): {
        packageId: string;
        moduleName: string;
        definitionName: string;
    } {
        const identity = this.valueDefinitionIdentities.get(definition);

        if (identity === undefined) {
            throw new DamlLfResolutionException(
                `could not resolve identity for value definition '${definition.name}'`,
            );
        }

        return identity;
    }

    public getTemplates(): readonly DamlLfTemplate[] {
        return [...this.templates.values()];
    }

    public getTemplateChoicesOrThrow(
        templateId: DamlLfTemplateId,
    ): readonly DamlLfChoice[] {
        return this.getTemplateOrThrow(templateId).choices;
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

                    if (definition instanceof DamlLfValueDefinition) {
                        const identity = {
                            packageId: pkg.packageId,
                            moduleName: module.name,
                            definitionName: definition.name,
                        };

                        this.valueDefinitions.set(
                            DamlLfCompilation.createDefinitionKey(
                                identity.packageId,
                                identity.moduleName,
                                identity.definitionName,
                            ),
                            definition,
                        );
                        this.valueDefinitionIdentities.set(
                            definition,
                            identity,
                        );
                    }

                    if (definition instanceof DamlLfTemplate) {
                        this.templates.set(
                            DamlLfCompilation.createTemplateKey(
                                definition.templateId,
                            ),
                            definition,
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
                        this.validateDataTypeOrThrow(definition);
                    }

                    if (definition instanceof DamlLfTemplate) {
                        this.getTypeSymbolOrThrow(
                            definition.templateId.toTypeConReference(),
                        );

                        for (const field of definition.fields) {
                            this.validateTypeOrThrow(field.type);
                        }

                        for (const choice of definition.choices) {
                            this.validateTypeOrThrow(choice.parameter.type);
                            this.validateTypeOrThrow(choice.returnType);
                        }
                    }
                }
            }
        }
    }

    private validateTypeOrThrow(type: DamlLfType): void {
        if (type.builtinType === DamlLfBuiltinType.contractId) {
            if (type.typeArguments.length !== 1) {
                throw new DamlLfSemanticException(
                    "builtin 'contractId' requires 1 type argument",
                );
            }

            return;
        }

        for (const typeArgument of type.typeArguments) {
            this.validateTypeOrThrow(typeArgument);
        }

        const reference = type.typeConReference;

        if (reference === undefined) {
            return;
        }

        this.getTypeSymbolOrThrow(reference);
    }

    private validateDataTypeOrThrow(definition: DamlLfDataType): void {
        if (definition.definition.kind === "record") {
            for (const field of definition.definition.fields) {
                this.validateTypeOrThrow(field.type);
            }

            return;
        } else if (definition.definition.kind === "variant") {
            for (const constructor of definition.definition.constructors) {
                this.validateTypeOrThrow(constructor.type);
            }
        }
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

    private static createDefinitionKey(
        packageId: string,
        moduleName: string,
        definitionName: string,
    ): string {
        return `${packageId}::${moduleName}::${definitionName}`;
    }

    private getTemplateOrThrow(templateId: DamlLfTemplateId): DamlLfTemplate {
        const template = this.templates.get(
            DamlLfCompilation.createTemplateKey(templateId),
        );

        if (template === undefined) {
            throw new DamlLfSemanticException(
                `could not resolve template '${templateId.templateName}' in module '${templateId.moduleName}'`,
            );
        }

        return template;
    }

    private static createTemplateKey(templateId: DamlLfTemplateId): string {
        return `${templateId.packageId}::${templateId.moduleName}::${templateId.templateName}`;
    }
}
