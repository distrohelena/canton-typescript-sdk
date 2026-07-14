import {
    BuiltinCon,
    BuiltinFunction,
    BuiltinType,
    DefDataType,
    DefTemplate,
    Expr,
    Module,
    Package as LfArchivePackage,
    SelfOrImportedPackageId,
    TemplateChoice,
    Type,
    TypeConId,
    Update,
    VarWithType,
} from "../../transports/grpc/generated/canton/com/digitalasset/daml/lf/archive/daml_lf2.js";
import { DamlLfLanguageVersion } from "../decoding/daml-lf-language-version.js";
import { DamlLfDecodeException } from "../errors/daml-lf-decode.exception.js";
import { DamlLfBuiltinType } from "./daml-lf-builtin-type.js";
import { DamlLfChoice } from "./daml-lf-choice.js";
import { DamlLfChoiceParameter } from "./daml-lf-choice-parameter.js";
import { DamlLfDataType } from "./daml-lf-data-type.js";
import { DamlLfExpression } from "./daml-lf-expression.js";
import { DamlLfField } from "./daml-lf-field.js";
import { DamlLfModule } from "./daml-lf-module.js";
import { DamlLfPackage } from "./daml-lf-package.js";
import { DamlLfTemplate } from "./daml-lf-template.js";
import { DamlLfTemplateId } from "./daml-lf-template-id.js";
import { DamlLfType } from "./daml-lf-type.js";
import { DamlLfValueDefinition } from "./daml-lf-value-definition.js";
import { TypeConReference } from "./type-con-reference.js";

export class Lf2ModelMapper {
    public static mapPackage(
        packageId: string,
        rawPackage: LfArchivePackage,
        languageVersion: DamlLfLanguageVersion,
    ): DamlLfPackage {
        return new DamlLfPackage({
            packageId,
            packageName: Lf2ModelMapper.resolveInternedString(
                rawPackage.internedStrings,
                rawPackage.metadata?.nameInternedStr,
            ),
            packageVersion: Lf2ModelMapper.resolveInternedString(
                rawPackage.internedStrings,
                rawPackage.metadata?.versionInternedStr,
            ),
            languageVersion,
            modules: rawPackage.modules.map(
                (module) =>
                    Lf2ModelMapper.mapModule(
                        packageId,
                        module,
                        rawPackage,
                    ),
            ),
        });
    }

    private static mapType(
        currentPackageId: string,
        rawPackage: LfArchivePackage,
        rawType?: Type,
    ): DamlLfType {
        if (
            rawType?.sum.oneofKind === "internedType"
            && rawType.sum.internedType >= 0
        ) {
            return Lf2ModelMapper.mapType(
                currentPackageId,
                rawPackage,
                rawPackage.internedTypes[rawType.sum.internedType],
            );
        }

        if (rawType?.sum.oneofKind === "tapp") {
            return Lf2ModelMapper.mapType(
                currentPackageId,
                rawPackage,
                rawType.sum.tapp.lhs,
            );
        }

        if (rawType?.sum.oneofKind === "forall") {
            return Lf2ModelMapper.mapType(
                currentPackageId,
                rawPackage,
                rawType.sum.forall.body,
            );
        }

        if (rawType?.sum.oneofKind === "con") {
            return new DamlLfType({
                typeConReference: Lf2ModelMapper.mapTypeConReferenceOrThrow(
                    currentPackageId,
                    rawPackage,
                    rawType.sum.con.tycon,
                    rawType,
                ),
            });
        }

        else if (rawType?.sum.oneofKind === "builtin") {
            return new DamlLfType({
                builtinType:
                    rawType.sum.builtin.builtin === BuiltinType.INT64
                        ? DamlLfBuiltinType.int64
                        : rawType.sum.builtin.builtin === BuiltinType.PARTY
                        ? DamlLfBuiltinType.party
                        : rawType.sum.builtin.builtin === BuiltinType.TEXT
                        ? DamlLfBuiltinType.text
                        : DamlLfBuiltinType.unknown,
            });
        }

        return new DamlLfType({
            builtinType: DamlLfBuiltinType.unknown,
        });
    }

    private static mapModule(
        packageId: string,
        rawModule: Module,
        rawPackage: LfArchivePackage,
    ): DamlLfModule {
        const moduleName = Lf2ModelMapper.resolveInternedDottedName(
            rawPackage.internedStrings,
            rawPackage.internedDottedNames,
            rawModule.nameInternedDname,
        );

        const dataTypes = rawModule.dataTypes
            .map((item) => Lf2ModelMapper.mapDataType(packageId, item, rawPackage))
            .filter((item): item is DamlLfDataType => item !== undefined);

        const definitions = [
            ...dataTypes,
            ...rawModule.values.map(
                (value) =>
                    new DamlLfValueDefinition({
                        name: Lf2ModelMapper.resolveInternedDottedName(
                            rawPackage.internedStrings,
                            rawPackage.internedDottedNames,
                            value.nameWithType?.nameInternedDname,
                        ),
                        type: Lf2ModelMapper.mapType(
                            packageId,
                            rawPackage,
                            value.nameWithType?.type,
                        ),
                        expression: Lf2ModelMapper.mapExpression(
                            value.expr,
                            rawPackage.internedStrings,
                            rawPackage.internedDottedNames,
                            packageId,
                            rawPackage,
                        ),
                    }),
            ),
            ...rawModule.templates.map((item) =>
                Lf2ModelMapper.mapTemplateOrThrow(
                    packageId,
                    moduleName,
                    item,
                    rawPackage,
                    dataTypes,
                ),
            ),
        ];

        return new DamlLfModule({
            name: moduleName,
            definitions,
        });
    }

    private static mapDataType(
        packageId: string,
        rawDataType: DefDataType,
        rawPackage: LfArchivePackage,
    ): DamlLfDataType | undefined {
        const fields =
            rawDataType.dataCons.oneofKind === "record"
                ? rawDataType.dataCons.record.fields.map((item) =>
                    Lf2ModelMapper.mapField(
                        packageId,
                        item.fieldInternedStr,
                        item.type,
                        rawPackage,
                    ),
                )
                : [];

        return new DamlLfDataType({
            name: Lf2ModelMapper.resolveInternedDottedName(
                rawPackage.internedStrings,
                rawPackage.internedDottedNames,
                rawDataType.nameInternedDname,
            ),
            fields,
        });
    }

    private static mapTemplateOrThrow(
        packageId: string,
        moduleName: string,
        rawTemplate: DefTemplate,
        rawPackage: LfArchivePackage,
        dataTypes: readonly DamlLfDataType[],
    ): DamlLfTemplate {
        const templateName = Lf2ModelMapper.resolveInternedDottedName(
            rawPackage.internedStrings,
            rawPackage.internedDottedNames,
            rawTemplate.tyconInternedDname,
        );

        const matchingDataType = dataTypes.find(
            (item) => item.name === templateName,
        );

        if (matchingDataType === undefined) {
            throw new DamlLfDecodeException(
                `daml lf template '${templateName}' is missing its backing data type`,
            );
        }

        return new DamlLfTemplate({
            templateId: new DamlLfTemplateId({
                packageId,
                moduleName,
                templateName,
            }),
            name: templateName,
            parameterName: Lf2ModelMapper.resolveInternedString(
                rawPackage.internedStrings,
                rawTemplate.paramInternedStr,
            ),
            fields: matchingDataType.fields,
            choices: rawTemplate.choices.map((item) =>
                Lf2ModelMapper.mapChoice(packageId, item, rawPackage),
            ),
        });
    }

    private static mapChoice(
        packageId: string,
        rawChoice: TemplateChoice,
        rawPackage: LfArchivePackage,
    ): DamlLfChoice {
        return new DamlLfChoice({
            name: Lf2ModelMapper.resolveInternedString(
                rawPackage.internedStrings,
                rawChoice.nameInternedStr,
            ),
            consuming: rawChoice.consuming,
            selfBinderName: Lf2ModelMapper.resolveInternedString(
                rawPackage.internedStrings,
                rawChoice.selfBinderInternedStr,
            ),
            parameter: Lf2ModelMapper.mapChoiceParameterOrThrow(
                packageId,
                rawChoice.argBinder,
                rawPackage,
            ),
            returnType: Lf2ModelMapper.mapType(
                packageId,
                rawPackage,
                rawChoice.retType,
            ),
            updateExpression:
                rawChoice.update === undefined
                    ? undefined
                    : Lf2ModelMapper.mapExpression(
                        rawChoice.update,
                        rawPackage.internedStrings,
                        rawPackage.internedDottedNames,
                        packageId,
                        rawPackage,
                    ),
        });
    }

    private static mapChoiceParameterOrThrow(
        packageId: string,
        rawParameter: VarWithType | undefined,
        rawPackage: LfArchivePackage,
    ): DamlLfChoiceParameter {
        if (rawParameter === undefined) {
            throw new DamlLfDecodeException(
                "daml lf template choice is missing its argument binder",
            );
        }

        return new DamlLfChoiceParameter({
            name: Lf2ModelMapper.resolveInternedString(
                rawPackage.internedStrings,
                rawParameter.varInternedStr,
            ),
            type: Lf2ModelMapper.mapType(
                packageId,
                rawPackage,
                rawParameter.type,
            ),
        });
    }

    private static mapField(
        packageId: string,
        nameInternedStr: number,
        rawType: Type | undefined,
        rawPackage: LfArchivePackage,
    ): DamlLfField {
        return new DamlLfField({
            name: Lf2ModelMapper.resolveInternedString(
                rawPackage.internedStrings,
                nameInternedStr,
            ),
            type: Lf2ModelMapper.mapType(packageId, rawPackage, rawType),
        });
    }

    private static mapTypeConReferenceOrThrow(
        currentPackageId: string,
        rawPackage: LfArchivePackage,
        rawTypeConId: TypeConId | undefined,
        rawType: Type,
    ): TypeConReference {
        const module = rawTypeConId?.module;

        if (module === undefined) {
            throw new DamlLfDecodeException(
                `daml lf type constructor is missing its module (${rawType.sum.oneofKind})`,
            );
        }

        return new TypeConReference({
            packageId: Lf2ModelMapper.resolvePackageIdOrThrow(
                currentPackageId,
                module.packageId,
                rawPackage,
            ),
            moduleName: Lf2ModelMapper.resolveInternedDottedName(
                rawPackage.internedStrings,
                rawPackage.internedDottedNames,
                module.moduleNameInternedDname,
            ),
            name: Lf2ModelMapper.resolveInternedDottedName(
                rawPackage.internedStrings,
                rawPackage.internedDottedNames,
                rawTypeConId?.nameInternedDname,
            ),
        });
    }

    private static resolvePackageIdOrThrow(
        currentPackageId: string,
        rawPackageId: SelfOrImportedPackageId | undefined,
        rawPackage: LfArchivePackage,
    ): string {
        if (rawPackageId === undefined) {
            return currentPackageId;
        }

        switch (rawPackageId.sum?.oneofKind) {
            case "selfPackageId":
                return currentPackageId;
            case "importedPackageIdInternedStr":
                return Lf2ModelMapper.resolveInternedString(
                    rawPackage.internedStrings,
                    rawPackageId.sum.importedPackageIdInternedStr,
                );
            case "packageImportId":
                return Lf2ModelMapper.resolveImportedPackageIdOrThrow(
                    rawPackage,
                    rawPackageId.sum.packageImportId,
                );
            case undefined:
                return currentPackageId;
            default:
                throw new DamlLfDecodeException(
                    "daml lf type constructor is missing its package id",
                );
        }
    }

    private static resolveImportedPackageIdOrThrow(
        rawPackage: LfArchivePackage,
        index: number,
    ): string {
        if (
            rawPackage.importsSum.oneofKind !== "packageImports" ||
            rawPackage.importsSum.packageImports.importedPackages[index] === undefined
        ) {
            throw new DamlLfDecodeException(
                "daml lf package references a missing imported package id",
            );
        }

        return rawPackage.importsSum.packageImports.importedPackages[index];
    }

    private static mapExpression(
        rawExpression: Expr | undefined,
        internedStrings: readonly string[],
        internedDottedNames: readonly { segmentsInternedStr: readonly number[] }[],
        currentPackageId: string,
        rawPackage: LfArchivePackage,
    ): DamlLfExpression {
        return Lf2ModelMapper.mapExpressionWithoutSourceLocation(
            rawExpression,
            internedStrings,
            internedDottedNames,
            currentPackageId,
            rawPackage,
        ).withSourceLocation(
            Lf2ModelMapper.mapExpressionSourceLocation(
                rawExpression,
                internedStrings,
                internedDottedNames,
                currentPackageId,
                rawPackage,
            ),
        );
    }

    private static mapExpressionWithoutSourceLocation(
        rawExpression: Expr | undefined,
        internedStrings: readonly string[],
        internedDottedNames: readonly { segmentsInternedStr: readonly number[] }[],
        currentPackageId: string,
        rawPackage: LfArchivePackage,
    ): DamlLfExpression {
        if (rawExpression?.sum.oneofKind === "varInternedStr") {
            return new DamlLfExpression({
                variableName: Lf2ModelMapper.resolveInternedString(
                    internedStrings,
                    rawExpression.sum.varInternedStr,
                ),
            });
        }

        if (rawExpression?.sum.oneofKind === "builtinLit") {
            const rawLiteral = rawExpression.sum.builtinLit;

            if (rawLiteral.sum.oneofKind === "textInternedStr") {
                return new DamlLfExpression({
                    textLiteral: Lf2ModelMapper.resolveInternedString(
                        internedStrings,
                        rawLiteral.sum.textInternedStr,
                    ),
                });
            }

            if (rawLiteral.sum.oneofKind === "int64") {
                return new DamlLfExpression({
                    int64Literal: rawLiteral.sum.int64,
                });
            }

            if (rawLiteral.sum.oneofKind === "numericInternedStr") {
                return new DamlLfExpression({
                    numericLiteral: Lf2ModelMapper.resolveInternedString(
                        internedStrings,
                        rawLiteral.sum.numericInternedStr,
                    ),
                });
            }

            if (rawLiteral.sum.oneofKind === "timestamp") {
                return new DamlLfExpression({
                    textLiteral: rawLiteral.sum.timestamp,
                });
            }

            if (rawLiteral.sum.oneofKind === "date") {
                return new DamlLfExpression({
                    textLiteral: String(rawLiteral.sum.date),
                });
            }
        }

        if (rawExpression?.sum.oneofKind === "builtinCon") {
            return new DamlLfExpression({
                builtinConstructor:
                    rawExpression.sum.builtinCon === BuiltinCon.CON_TRUE
                        ? "true"
                        : rawExpression.sum.builtinCon === BuiltinCon.CON_FALSE
                            ? "false"
                            : "unit",
            });
        }

        if (rawExpression?.sum.oneofKind === "builtin") {
            return new DamlLfExpression({
                builtinFunction:
                    rawExpression.sum.builtin === BuiltinFunction.EQUAL
                        ? "equal"
                        : rawExpression.sum.builtin === BuiltinFunction.GREATER
                            ? "greater"
                            : rawExpression.sum.builtin
                                === BuiltinFunction.APPEND_TEXT
                                ? "appendText"
                                : (BuiltinFunction[rawExpression.sum.builtin]
                                    ?? "unsupported"),
            });
        }

        if (rawExpression?.sum.oneofKind === "val") {
            const valueReference = rawExpression.sum.val;

            return new DamlLfExpression({
                valueReference: {
                    packageId: Lf2ModelMapper.resolvePackageIdOrThrow(
                        currentPackageId,
                        valueReference.module?.packageId,
                        rawPackage,
                    ),
                    moduleName: Lf2ModelMapper.resolveInternedDottedName(
                        internedStrings,
                        internedDottedNames,
                        valueReference.module?.moduleNameInternedDname,
                    ),
                    definitionName: Lf2ModelMapper.resolveInternedDottedName(
                        internedStrings,
                        internedDottedNames,
                        valueReference.nameInternedDname,
                    ),
                },
            });
        }

        if (rawExpression?.sum.oneofKind === "abs") {
            return new DamlLfExpression({
                lambda: {
                    parameters: rawExpression.sum.abs.param.map((parameter) =>
                        Lf2ModelMapper.resolveInternedString(
                            rawPackage.internedStrings,
                            parameter.varInternedStr,
                        ),
                    ),
                    body: Lf2ModelMapper.mapExpression(
                        rawExpression.sum.abs.body,
                        internedStrings,
                        internedDottedNames,
                        currentPackageId,
                        rawPackage,
                    ),
                },
            });
        }

        if (rawExpression?.sum.oneofKind === "app") {
            return new DamlLfExpression({
                application: {
                    function: Lf2ModelMapper.mapExpression(
                        rawExpression.sum.app.fun,
                        internedStrings,
                        internedDottedNames,
                        currentPackageId,
                        rawPackage,
                    ),
                    arguments: rawExpression.sum.app.args.map((argument) =>
                        Lf2ModelMapper.mapExpression(
                            argument,
                            internedStrings,
                            internedDottedNames,
                            currentPackageId,
                            rawPackage,
                        ),
                    ),
                },
            });
        }

        if (rawExpression?.sum.oneofKind === "recCon") {
            return new DamlLfExpression({
                recordConstruction: {
                    fields: rawExpression.sum.recCon.fields.map((field) => ({
                        name: Lf2ModelMapper.resolveInternedString(
                            internedStrings,
                            field.fieldInternedStr,
                        ),
                        value: Lf2ModelMapper.mapExpression(
                            field.expr,
                            internedStrings,
                            internedDottedNames,
                            currentPackageId,
                            rawPackage,
                        ),
                    })),
                },
            });
        }

        if (rawExpression?.sum.oneofKind === "recProj") {
            return new DamlLfExpression({
                recordProjection: {
                    fieldName: Lf2ModelMapper.resolveInternedString(
                        internedStrings,
                        rawExpression.sum.recProj.fieldInternedStr,
                    ),
                    record: Lf2ModelMapper.mapExpression(
                        rawExpression.sum.recProj.record,
                        internedStrings,
                        internedDottedNames,
                        currentPackageId,
                        rawPackage,
                    ),
                },
            });
        }

        if (rawExpression?.sum.oneofKind === "recUpd") {
            return new DamlLfExpression({
                recordUpdate: {
                    fieldName: Lf2ModelMapper.resolveInternedString(
                        internedStrings,
                        rawExpression.sum.recUpd.fieldInternedStr,
                    ),
                    record: Lf2ModelMapper.mapExpression(
                        rawExpression.sum.recUpd.record,
                        internedStrings,
                        internedDottedNames,
                        currentPackageId,
                        rawPackage,
                    ),
                    value: Lf2ModelMapper.mapExpression(
                        rawExpression.sum.recUpd.update,
                        internedStrings,
                        internedDottedNames,
                        currentPackageId,
                        rawPackage,
                    ),
                },
            });
        }

        if (rawExpression?.sum.oneofKind === "variantCon") {
            return new DamlLfExpression({
                variantConstruction: {
                    constructorName: Lf2ModelMapper.resolveInternedString(
                        internedStrings,
                        rawExpression.sum.variantCon.variantConInternedStr,
                    ),
                    argument: Lf2ModelMapper.mapExpression(
                        rawExpression.sum.variantCon.variantArg,
                        internedStrings,
                        internedDottedNames,
                        currentPackageId,
                        rawPackage,
                    ),
                },
            });
        }

        if (rawExpression?.sum.oneofKind === "structCon") {
            return new DamlLfExpression({
                recordConstruction: {
                    fields: rawExpression.sum.structCon.fields.map((field) => ({
                        name: Lf2ModelMapper.resolveInternedString(
                            internedStrings,
                            field.fieldInternedStr,
                        ),
                        value: Lf2ModelMapper.mapExpression(
                            field.expr,
                            internedStrings,
                            internedDottedNames,
                            currentPackageId,
                            rawPackage,
                        ),
                    })),
                },
            });
        }

        if (rawExpression?.sum.oneofKind === "structProj") {
            return new DamlLfExpression({
                recordProjection: {
                    fieldName: Lf2ModelMapper.resolveInternedString(
                        internedStrings,
                        rawExpression.sum.structProj.fieldInternedStr,
                    ),
                    record: Lf2ModelMapper.mapExpression(
                        rawExpression.sum.structProj.struct,
                        internedStrings,
                        internedDottedNames,
                        currentPackageId,
                        rawPackage,
                    ),
                },
            });
        }

        if (rawExpression?.sum.oneofKind === "structUpd") {
            return new DamlLfExpression({
                recordUpdate: {
                    fieldName: Lf2ModelMapper.resolveInternedString(
                        internedStrings,
                        rawExpression.sum.structUpd.fieldInternedStr,
                    ),
                    record: Lf2ModelMapper.mapExpression(
                        rawExpression.sum.structUpd.struct,
                        internedStrings,
                        internedDottedNames,
                        currentPackageId,
                        rawPackage,
                    ),
                    value: Lf2ModelMapper.mapExpression(
                        rawExpression.sum.structUpd.update,
                        internedStrings,
                        internedDottedNames,
                        currentPackageId,
                        rawPackage,
                    ),
                },
            });
        }

        if (rawExpression?.sum.oneofKind === "optionalNone") {
            return new DamlLfExpression({
                optionalConstruction: {},
            });
        }

        if (rawExpression?.sum.oneofKind === "optionalSome") {
            return new DamlLfExpression({
                optionalConstruction: {
                    value: Lf2ModelMapper.mapExpression(
                        rawExpression.sum.optionalSome.value,
                        internedStrings,
                        internedDottedNames,
                        currentPackageId,
                        rawPackage,
                    ),
                },
            });
        }

        if (rawExpression?.sum.oneofKind === "update") {
            return new DamlLfExpression({
                updateExpression: Lf2ModelMapper.mapUpdateExpression(
                    rawExpression.sum.update,
                    internedStrings,
                    internedDottedNames,
                    currentPackageId,
                    rawPackage,
                ),
            });
        }

        if (rawExpression?.sum.oneofKind === "tyApp") {
            return Lf2ModelMapper.mapExpression(
                rawExpression.sum.tyApp.expr,
                internedStrings,
                internedDottedNames,
                currentPackageId,
                rawPackage,
            );
        }

        if (rawExpression?.sum.oneofKind === "tyAbs") {
            return Lf2ModelMapper.mapExpression(
                rawExpression.sum.tyAbs.body,
                internedStrings,
                internedDottedNames,
                currentPackageId,
                rawPackage,
            );
        }

        if (rawExpression?.sum.oneofKind === "enumCon") {
            return new DamlLfExpression({
                enumConstruction: {
                    constructorName: Lf2ModelMapper.resolveInternedString(
                        internedStrings,
                        rawExpression.sum.enumCon.enumConInternedStr,
                    ),
                },
            });
        }

        if (rawExpression?.sum.oneofKind === "nil") {
            return new DamlLfExpression({
                listConstruction: {
                    front: [],
                },
            });
        }

        if (rawExpression?.sum.oneofKind === "cons") {
            return new DamlLfExpression({
                listConstruction: {
                    front: rawExpression.sum.cons.front.map((item) =>
                        Lf2ModelMapper.mapExpression(
                            item,
                            internedStrings,
                            internedDottedNames,
                            currentPackageId,
                            rawPackage,
                        ),
                    ),
                    tail: Lf2ModelMapper.mapExpression(
                        rawExpression.sum.cons.tail,
                        internedStrings,
                        internedDottedNames,
                        currentPackageId,
                        rawPackage,
                    ),
                },
            });
        }

        if (rawExpression?.sum.oneofKind === "throw") {
            return new DamlLfExpression({
                throwExpression: {
                    exception: Lf2ModelMapper.mapExpression(
                        rawExpression.sum.throw.exceptionExpr,
                        internedStrings,
                        internedDottedNames,
                        currentPackageId,
                        rawPackage,
                    ),
                },
            });
        }

        if (rawExpression?.sum.oneofKind === "case") {
            return new DamlLfExpression({
                caseExpression: {
                    scrutinee: Lf2ModelMapper.mapExpression(
                        rawExpression.sum.case.scrut,
                        internedStrings,
                        internedDottedNames,
                        currentPackageId,
                        rawPackage,
                    ),
                    alternatives: rawExpression.sum.case.alts.map((alternative) => ({
                        patternKind:
                            alternative.sum.oneofKind === "builtinCon"
                                ? "builtinCon"
                                : alternative.sum.oneofKind === "variant"
                                    ? "variant"
                                    : alternative.sum.oneofKind === "optionalNone"
                                        ? "optionalNone"
                                        : alternative.sum.oneofKind
                                            === "optionalSome"
                                            ? "optionalSome"
                                            : alternative.sum.oneofKind === "enum"
                                                ? "enum"
                                                : alternative.sum.oneofKind === "nil"
                                                    ? "nil"
                                                    : alternative.sum.oneofKind === "cons"
                                                        ? "cons"
                                    : "default",
                        builtinConstructor:
                            alternative.sum.oneofKind === "builtinCon"
                                ? alternative.sum.builtinCon === BuiltinCon.CON_TRUE
                                    ? "true"
                                    : alternative.sum.builtinCon
                                        === BuiltinCon.CON_FALSE
                                        ? "false"
                                        : "unit"
                                : undefined,
                        constructorName:
                            alternative.sum.oneofKind === "variant"
                                ? Lf2ModelMapper.resolveInternedString(
                                    internedStrings,
                                    alternative.sum.variant.variantInternedStr,
                                )
                                : alternative.sum.oneofKind === "enum"
                                    ? Lf2ModelMapper.resolveInternedString(
                                        internedStrings,
                                        alternative.sum.enum.constructorInternedStr,
                                    )
                                : undefined,
                        binderName:
                            alternative.sum.oneofKind === "variant"
                                ? Lf2ModelMapper.resolveInternedString(
                                    internedStrings,
                                    alternative.sum.variant.binderInternedStr,
                                )
                                : alternative.sum.oneofKind === "optionalSome"
                                    ? Lf2ModelMapper.resolveInternedString(
                                        internedStrings,
                                        alternative.sum.optionalSome.varBodyInternedStr,
                                    )
                                : undefined,
                        headBinderName:
                            alternative.sum.oneofKind === "cons"
                                ? Lf2ModelMapper.resolveInternedString(
                                    internedStrings,
                                    alternative.sum.cons.varHeadInternedStr,
                                )
                                : undefined,
                        tailBinderName:
                            alternative.sum.oneofKind === "cons"
                                ? Lf2ModelMapper.resolveInternedString(
                                    internedStrings,
                                    alternative.sum.cons.varTailInternedStr,
                                )
                                : undefined,
                        body: Lf2ModelMapper.mapExpression(
                            alternative.body,
                            internedStrings,
                            internedDottedNames,
                            currentPackageId,
                            rawPackage,
                        ),
                    })),
                },
            });
        }

        if (rawExpression?.sum.oneofKind === "internedExpr") {
            return Lf2ModelMapper.mapExpression(
                rawPackage.internedExprs[rawExpression.sum.internedExpr],
                internedStrings,
                internedDottedNames,
                currentPackageId,
                rawPackage,
            );
        }

        if (rawExpression?.sum.oneofKind === "let") {
            return new DamlLfExpression({
                letExpression: {
                    bindings: rawExpression.sum.let.bindings.map((binding) => ({
                        name: Lf2ModelMapper.resolveInternedString(
                            rawPackage.internedStrings,
                            binding.binder?.varInternedStr,
                        ),
                        value: Lf2ModelMapper.mapExpression(
                            binding.bound,
                            internedStrings,
                            internedDottedNames,
                            currentPackageId,
                            rawPackage,
                        ),
                    })),
                    body: Lf2ModelMapper.mapExpression(
                        rawExpression.sum.let.body,
                        internedStrings,
                        internedDottedNames,
                        currentPackageId,
                        rawPackage,
                    ),
                },
            });
        }

        return new DamlLfExpression({
            unsupportedNodeKind: rawExpression?.sum.oneofKind,
        });
    }

    private static mapExpressionSourceLocation(
        rawExpression: Expr | undefined,
        internedStrings: readonly string[],
        internedDottedNames: readonly { segmentsInternedStr: readonly number[] }[],
        currentPackageId: string,
        rawPackage: LfArchivePackage,
    ) {
        const rawLocation = rawExpression?.location;
        const range = rawLocation?.range;

        if (range === undefined) {
            return undefined;
        }

        return {
            packageId:
                rawLocation?.module === undefined
                    ? undefined
                    : Lf2ModelMapper.resolvePackageIdOrThrow(
                        currentPackageId,
                        rawLocation.module.packageId,
                        rawPackage,
                    ),
            moduleName:
                rawLocation?.module === undefined
                    ? undefined
                    : Lf2ModelMapper.resolveInternedDottedName(
                        internedStrings,
                        internedDottedNames,
                        rawLocation.module.moduleNameInternedDname,
                    ),
            startLine: range.startLine,
            startColumn: range.startCol,
            endLine: range.endLine,
            endColumn: range.endCol,
        };
    }

    private static mapUpdateExpression(
        rawUpdate: Update,
        internedStrings: readonly string[],
        internedDottedNames: readonly { segmentsInternedStr: readonly number[] }[],
        currentPackageId: string,
        rawPackage: LfArchivePackage,
    ): DamlLfExpression["updateExpression"] {
        switch (rawUpdate.sum.oneofKind) {
            case "pure":
                return {
                    kind: "pure",
                    expression: Lf2ModelMapper.mapExpression(
                        rawUpdate.sum.pure.expr,
                        internedStrings,
                        internedDottedNames,
                        currentPackageId,
                        rawPackage,
                    ),
                };
            case "block":
                return {
                    kind: "block",
                    bindings: rawUpdate.sum.block.bindings.map((binding) => ({
                        name: Lf2ModelMapper.resolveInternedString(
                            internedStrings,
                            binding.binder?.varInternedStr,
                        ),
                        value: Lf2ModelMapper.mapExpression(
                            binding.bound,
                            internedStrings,
                            internedDottedNames,
                            currentPackageId,
                            rawPackage,
                        ),
                    })),
                    body: Lf2ModelMapper.mapExpression(
                        rawUpdate.sum.block.body,
                        internedStrings,
                        internedDottedNames,
                        currentPackageId,
                        rawPackage,
                    ),
                };
            case "embedExpr":
                return {
                    kind: "embedExpr",
                    expression: Lf2ModelMapper.mapExpression(
                        rawUpdate.sum.embedExpr.body,
                        internedStrings,
                        internedDottedNames,
                        currentPackageId,
                        rawPackage,
                    ),
                };
            case "tryCatch":
                return {
                    kind: "tryCatch",
                    expression: Lf2ModelMapper.mapExpression(
                        rawUpdate.sum.tryCatch.tryExpr,
                        internedStrings,
                        internedDottedNames,
                        currentPackageId,
                        rawPackage,
                    ),
                    catchVariableName: Lf2ModelMapper.resolveInternedString(
                        internedStrings,
                        rawUpdate.sum.tryCatch.varInternedStr,
                    ),
                    catchExpression: Lf2ModelMapper.mapExpression(
                        rawUpdate.sum.tryCatch.catchExpr,
                        internedStrings,
                        internedDottedNames,
                        currentPackageId,
                        rawPackage,
                    ),
                };
            case "create":
                return {
                    kind: "create",
                    templateId: Lf2ModelMapper.mapTemplateReferenceOrThrow(
                        currentPackageId,
                        rawPackage,
                        rawUpdate.sum.create.template,
                    ),
                    argument: Lf2ModelMapper.mapExpression(
                        rawUpdate.sum.create.expr,
                        internedStrings,
                        internedDottedNames,
                        currentPackageId,
                        rawPackage,
                    ),
                };
            case "createInterface":
                return {
                    kind: "createInterface",
                    interfaceId: Lf2ModelMapper.mapTemplateReferenceOrThrow(
                        currentPackageId,
                        rawPackage,
                        rawUpdate.sum.createInterface.interface,
                    ),
                    argument: Lf2ModelMapper.mapExpression(
                        rawUpdate.sum.createInterface.expr,
                        internedStrings,
                        internedDottedNames,
                        currentPackageId,
                        rawPackage,
                    ),
                };
            case "fetch":
                return {
                    kind: "fetch",
                    templateId: Lf2ModelMapper.mapTemplateReferenceOrThrow(
                        currentPackageId,
                        rawPackage,
                        rawUpdate.sum.fetch.template,
                    ),
                    contractId: Lf2ModelMapper.mapExpression(
                        rawUpdate.sum.fetch.cid,
                        internedStrings,
                        internedDottedNames,
                        currentPackageId,
                        rawPackage,
                    ),
                };
            case "fetchInterface":
                return {
                    kind: "fetchInterface",
                    interfaceId: Lf2ModelMapper.mapTemplateReferenceOrThrow(
                        currentPackageId,
                        rawPackage,
                        rawUpdate.sum.fetchInterface.interface,
                    ),
                    contractId: Lf2ModelMapper.mapExpression(
                        rawUpdate.sum.fetchInterface.cid,
                        internedStrings,
                        internedDottedNames,
                        currentPackageId,
                        rawPackage,
                    ),
                };
            case "exercise":
                return {
                    kind: "exercise",
                    templateId: Lf2ModelMapper.mapTemplateReferenceOrThrow(
                        currentPackageId,
                        rawPackage,
                        rawUpdate.sum.exercise.template,
                    ),
                    choiceName: Lf2ModelMapper.resolveInternedString(
                        internedStrings,
                        rawUpdate.sum.exercise.choiceInternedStr,
                    ),
                    contractId: Lf2ModelMapper.mapExpression(
                        rawUpdate.sum.exercise.cid,
                        internedStrings,
                        internedDottedNames,
                        currentPackageId,
                        rawPackage,
                    ),
                    argument: Lf2ModelMapper.mapExpression(
                        rawUpdate.sum.exercise.arg,
                        internedStrings,
                        internedDottedNames,
                        currentPackageId,
                        rawPackage,
                    ),
                };
            case "exerciseInterface":
                return {
                    kind: "exerciseInterface",
                    interfaceId: Lf2ModelMapper.mapTemplateReferenceOrThrow(
                        currentPackageId,
                        rawPackage,
                        rawUpdate.sum.exerciseInterface.interface,
                    ),
                    choiceName: Lf2ModelMapper.resolveInternedString(
                        internedStrings,
                        rawUpdate.sum.exerciseInterface.choiceInternedStr,
                    ),
                    contractId: Lf2ModelMapper.mapExpression(
                        rawUpdate.sum.exerciseInterface.cid,
                        internedStrings,
                        internedDottedNames,
                        currentPackageId,
                        rawPackage,
                    ),
                    argument: Lf2ModelMapper.mapExpression(
                        rawUpdate.sum.exerciseInterface.arg,
                        internedStrings,
                        internedDottedNames,
                        currentPackageId,
                        rawPackage,
                    ),
                    guardExpression:
                        rawUpdate.sum.exerciseInterface.guard === undefined
                            ? undefined
                            : Lf2ModelMapper.mapExpression(
                                rawUpdate.sum.exerciseInterface.guard,
                                internedStrings,
                                internedDottedNames,
                                currentPackageId,
                                rawPackage,
                            ),
                };
            case "getTime":
                return {
                    kind: "getTime",
                };
            case "ledgerTimeLt":
                return {
                    kind: "ledgerTimeLt",
                    expression: Lf2ModelMapper.mapExpression(
                        rawUpdate.sum.ledgerTimeLt,
                        internedStrings,
                        internedDottedNames,
                        currentPackageId,
                        rawPackage,
                    ),
                };
            default:
                return {
                    kind: "embedExpr",
                    expression: new DamlLfExpression({
                        unsupportedNodeKind: `update.${rawUpdate.sum.oneofKind ?? "unknown"}`,
                    }),
                };
        }
    }

    private static mapTemplateReferenceOrThrow(
        currentPackageId: string,
        rawPackage: LfArchivePackage,
        rawTypeConId: TypeConId | undefined,
    ): {
        packageId: string;
        moduleName: string;
        templateName: string;
    } {
        const reference = Lf2ModelMapper.mapTypeConReferenceOrThrow(
            currentPackageId,
            rawPackage,
            rawTypeConId,
            {
                sum: {
                    oneofKind: "con",
                    con: {
                        tycon: rawTypeConId,
                        args: [],
                    },
                },
            },
        );

        return {
            packageId: reference.packageId,
            moduleName: reference.moduleName,
            templateName: reference.name,
        };
    }

    private static resolveInternedString(
        internedStrings: readonly string[],
        index: number | undefined,
    ): string {
        if (index === undefined || internedStrings[index] === undefined) {
            throw new DamlLfDecodeException(
                "daml lf package references a missing interned string",
            );
        }

        return internedStrings[index];
    }

    private static resolveInternedDottedName(
        internedStrings: readonly string[],
        internedDottedNames: readonly { segmentsInternedStr: readonly number[] }[],
        index: number | undefined,
    ): string {
        if (index === undefined || internedDottedNames[index] === undefined) {
            throw new DamlLfDecodeException(
                "daml lf package references a missing interned dotted name",
            );
        }

        return internedDottedNames[index].segmentsInternedStr
            .map((segmentIndex) =>
                Lf2ModelMapper.resolveInternedString(
                    internedStrings,
                    segmentIndex,
                ),
            )
            .join(".");
    }
}
