import { DamlLfCompilation } from "../../daml-lf/daml-lf-compilation.js";
import { DamlLfBuiltinType } from "../../daml-lf/model/daml-lf-builtin-type.js";
import { DamlLfChoice } from "../../daml-lf/model/daml-lf-choice.js";
import { DamlLfDataType } from "../../daml-lf/model/daml-lf-data-type.js";
import { DamlLfField } from "../../daml-lf/model/daml-lf-field.js";
import { DamlLfTemplate } from "../../daml-lf/model/daml-lf-template.js";
import { DamlLfType } from "../../daml-lf/model/daml-lf-type.js";
import { DamlLfSemanticModel } from "../../daml-lf/semantics/daml-lf-semantic-model.js";
import { TypeConReference } from "../../daml-lf/model/type-con-reference.js";
import { DamlInterfaceUnsupportedShapeException } from "../errors/daml-interface-unsupported-shape.exception.js";
import { AnalyzedChoice } from "./analyzed-choice.js";
import {
    AnalyzedDamlType,
} from "./analyzed-daml-type.js";
import { AnalyzedDamlTypeDefinition } from "./analyzed-daml-type-definition.js";
import { AnalyzedTemplate, AnalyzedTemplateField } from "./analyzed-template.js";

export class DamlInterfaceAnalysisResult {
    public readonly templates: readonly AnalyzedTemplate[];
    public readonly typeDefinitions: readonly AnalyzedDamlTypeDefinition[];

    public constructor(init: {
        templates: readonly AnalyzedTemplate[];
        typeDefinitions: readonly AnalyzedDamlTypeDefinition[];
    }) {
        this.templates = Object.freeze([...init.templates]);
        this.typeDefinitions = Object.freeze([...init.typeDefinitions]);
    }
}

export class DamlInterfaceAnalyzer {
    /** Analyzes compiled DAML-LF templates into generator-facing metadata. */
    public analyzeOrThrow(
        compilation: DamlLfCompilation,
    ): DamlInterfaceAnalysisResult {
        const semanticModel = compilation.createSemanticModel();

        const typeBuilder = new AnalyzedDamlTypeBuilder(semanticModel, (value) =>
            this.toCamelCase(value),
        );

        const templates = semanticModel
            .getTemplates()
            .map((item) => this.analyzeTemplateOrThrow(item, typeBuilder));

        return new DamlInterfaceAnalysisResult({
            templates,
            typeDefinitions: typeBuilder.getTypeDefinitions(),
        });
    }

    private analyzeTemplateOrThrow(
        template: DamlLfTemplate,
        typeBuilder: AnalyzedDamlTypeBuilder,
    ): AnalyzedTemplate {
        return new AnalyzedTemplate({
            templateId: template.templateId,
            className: this.toPascalCase(template.name),
            fileName: `${this.toKebabCase(template.name)}.ts`,
            createFields: template.fields.map((item) =>
                this.analyzeTemplateFieldOrThrow(item, typeBuilder),
            ),
            choices: template.choices.map((item) =>
                this.analyzeChoiceOrThrow(item, typeBuilder),
            ),
        });
    }

    private analyzeTemplateFieldOrThrow(
        field: DamlLfField,
        typeBuilder: AnalyzedDamlTypeBuilder,
    ): AnalyzedTemplateField {
        const type = typeBuilder.buildOrThrow(
            field.type,
            `template field '${field.name}'`,
        );

        return new AnalyzedTemplateField({
            name: field.name,
            propertyName: this.toCamelCase(field.name),
            type,
        });
    }

    private analyzeChoiceOrThrow(
        choice: DamlLfChoice,
        typeBuilder: AnalyzedDamlTypeBuilder,
    ): AnalyzedChoice {
        const parameterType = typeBuilder.buildOrThrow(
            choice.parameter.type,
            `choice parameter '${choice.parameter.name}'`,
        );

        const returnType = typeBuilder.buildOrThrow(
            choice.returnType,
            `choice return type '${choice.name}'`,
        );

        return new AnalyzedChoice({
            name: choice.name,
            methodName: `exercise${this.toPascalCase(choice.name)}`,
            parameterName: this.toCamelCase(choice.parameter.name),
            parameterType,
            returnType,
        });
    }

    private toCamelCase(value: string): string {
        const pascalCase = this.toPascalCase(value);

        if (pascalCase.length === 0) {
            throw new DamlInterfaceUnsupportedShapeException(
                "DAML interface generator cannot normalize an empty identifier",
            );
        }

        return pascalCase[0].toLowerCase() + pascalCase.slice(1);
    }

    private toPascalCase(value: string): string {
        const normalizedValue = value
            .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
            .replace(/[^A-Za-z0-9]+/g, " ")
            .trim();

        if (normalizedValue.length === 0) {
            throw new DamlInterfaceUnsupportedShapeException(
                "DAML interface generator cannot normalize an empty identifier",
            );
        }

        return normalizedValue
            .split(/\s+/)
            .map(
                (segment) =>
                    segment[0].toUpperCase() + segment.slice(1),
            )
            .join("");
    }

    private toKebabCase(value: string): string {
        return this.toPascalCase(value)
            .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
            .toLowerCase();
    }
}

class AnalyzedDamlTypeBuilder {
    private readonly definitionKeys: string[] = [];
    private readonly canonicalIdentities = new Map<string, TypeConReference>();
    private readonly definitions = new Map<
        string,
        AnalyzedDamlTypeDefinition | undefined
    >();

    public constructor(
        private readonly semanticModel: DamlLfSemanticModel,
        private readonly toCamelCase: (value: string) => string,
    ) {}

    public buildOrThrow(type: DamlLfType, context: string): AnalyzedDamlType {
        if (type.typeConReference !== undefined) {
            if (type.builtinType !== DamlLfBuiltinType.unknown) {
                throw this.unsupported(context, "a type constructor cannot also be a builtin type");
            } else if (type.typeArguments.length !== 0) {
                throw this.unsupported(context, "generic named type applications are not supported");
            }

            return this.buildNamedReferenceOrThrow(type.typeConReference, context);
        }

        switch (type.builtinType) {
            case DamlLfBuiltinType.unit:
            case DamlLfBuiltinType.bool:
            case DamlLfBuiltinType.int64:
            case DamlLfBuiltinType.date:
            case DamlLfBuiltinType.timestamp:
            case DamlLfBuiltinType.party:
            case DamlLfBuiltinType.text:
                this.assertArgumentCountOrThrow(type, 0, context);

                return Object.freeze({
                    kind: "primitive" as const,
                    builtinType: type.builtinType,
                    ...(type.numericScale === undefined
                        ? {}
                        : { numericScale: type.numericScale }),
                });
            case DamlLfBuiltinType.numeric:
                this.assertArgumentCountOrThrow(type, 0, context);

                if (
                    type.numericScale === undefined ||
                    !Number.isInteger(type.numericScale) ||
                    type.numericScale < 0 ||
                    type.numericScale > 37
                ) {
                    throw this.unsupported(
                        context,
                        "numeric values require an integer scale from 0 through 37",
                    );
                }

                return Object.freeze({
                    kind: "primitive" as const,
                    builtinType: type.builtinType,
                    numericScale: type.numericScale,
                });
            case DamlLfBuiltinType.contractId:
                return Object.freeze({
                    kind: "contractId" as const,
                    contract: this.buildUnaryArgumentOrThrow(type, context),
                });
            case DamlLfBuiltinType.optional:
                return Object.freeze({
                    kind: "optional" as const,
                    element: this.buildUnaryArgumentOrThrow(type, context),
                });
            case DamlLfBuiltinType.list:
                return Object.freeze({
                    kind: "list" as const,
                    element: this.buildUnaryArgumentOrThrow(type, context),
                });
            case DamlLfBuiltinType.textMap:
                return Object.freeze({
                    kind: "textMap" as const,
                    value: this.buildUnaryArgumentOrThrow(type, context),
                });
            case DamlLfBuiltinType.genMap:
                this.assertArgumentCountOrThrow(type, 2, context);

                return Object.freeze({
                    kind: "genMap" as const,
                    key: this.buildOrThrow(type.typeArguments[0], context),
                    value: this.buildOrThrow(type.typeArguments[1], context),
                });
            case DamlLfBuiltinType.unknown:
                throw this.unsupported(context, "the type is not serializable");
        }
    }

    public getTypeDefinitions(): readonly AnalyzedDamlTypeDefinition[] {
        return Object.freeze(this.definitionKeys.map((key) => {
            const definition = this.definitions.get(key);

            if (definition === undefined) {
                throw new DamlInterfaceUnsupportedShapeException(
                    `could not finish resolving named DAML type '${key}'`,
                );
            }

            return definition;
        }));
    }

    private buildUnaryArgumentOrThrow(
        type: DamlLfType,
        context: string,
    ): AnalyzedDamlType {
        this.assertArgumentCountOrThrow(type, 1, context);

        return this.buildOrThrow(type.typeArguments[0], context);
    }

    private buildNamedReferenceOrThrow(
        reference: TypeConReference,
        context: string,
    ): AnalyzedDamlType {
        const key = this.getDefinitionKey(reference);

        const identity = this.getCanonicalIdentity(reference, key);

        if (!this.definitions.has(key)) {
            this.definitionKeys.push(key);
            this.definitions.set(key, undefined);
            this.definitions.set(
                key,
                this.buildNamedDefinitionOrThrow(reference, identity, context),
            );
        }

        return Object.freeze({
            kind: "namedReference" as const,
            identity,
        });
    }

    private buildNamedDefinitionOrThrow(
        reference: TypeConReference,
        identity: TypeConReference,
        context: string,
    ): AnalyzedDamlTypeDefinition {
        let dataType: DamlLfDataType;

        try {
            dataType = this.semanticModel.getDataTypeOrThrow(reference);
        } catch (error) {
            throw this.unsupported(
                context,
                `could not resolve named type '${reference.name}'`,
            );
        }

        if (dataType.definition.kind === "record") {
            return Object.freeze({
                identity,
                kind: "record" as const,
                fields: Object.freeze(dataType.definition.fields.map((field) =>
                    Object.freeze({
                        damlLabel: field.name,
                        propertyName: this.toCamelCase(field.name),
                        type: this.buildOrThrow(
                            field.type,
                            `field '${field.name}' of record '${reference.name}'`,
                        ),
                    })
                )),
            });
        } else if (dataType.definition.kind === "variant") {
            return Object.freeze({
                identity,
                kind: "variant" as const,
                constructors: Object.freeze(
                    dataType.definition.constructors.map((constructor) =>
                        Object.freeze({
                            constructor: constructor.name,
                            payload: this.buildOrThrow(
                                constructor.type,
                                `constructor '${constructor.name}' of variant '${reference.name}'`,
                            ),
                        })
                    ),
                ),
            });
        }

        return Object.freeze({
            identity,
            kind: "enum" as const,
            constructors: Object.freeze([...dataType.definition.constructors]),
        });
    }

    private assertArgumentCountOrThrow(
        type: DamlLfType,
        expectedCount: number,
        context: string,
    ): void {
        if (type.typeArguments.length !== expectedCount) {
            throw this.unsupported(
                context,
                `builtin '${type.builtinType}' requires ${expectedCount} type argument${expectedCount === 1 ? "" : "s"}`,
            );
        }
    }

    private getDefinitionKey(reference: TypeConReference): string {
        return `${reference.packageId}::${reference.moduleName}::${reference.name}`;
    }

    private getCanonicalIdentity(
        reference: TypeConReference,
        key: string,
    ): TypeConReference {
        let identity = this.canonicalIdentities.get(key);

        if (identity === undefined) {
            identity = Object.freeze(new TypeConReference({
                packageId: reference.packageId,
                moduleName: reference.moduleName,
                name: reference.name,
            }));
            this.canonicalIdentities.set(key, identity);
        }

        return identity;
    }

    private unsupported(
        context: string,
        reason: string,
    ): DamlInterfaceUnsupportedShapeException {
        return new DamlInterfaceUnsupportedShapeException(
            `${context} is not supported by the DAML interface generator: ${reason}`,
        );
    }
}
