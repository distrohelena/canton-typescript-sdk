import {
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
                    rawType.sum.builtin.builtin === BuiltinType.TEXT
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
        if (rawDataType.dataCons.oneofKind !== "record") {
            return undefined;
        }

        return new DamlLfDataType({
            name: Lf2ModelMapper.resolveInternedDottedName(
                rawPackage.internedStrings,
                rawPackage.internedDottedNames,
                rawDataType.nameInternedDname,
            ),
            fields: rawDataType.dataCons.record.fields.map((item) =>
                Lf2ModelMapper.mapField(
                    packageId,
                    item.fieldInternedStr,
                    item.type,
                    rawPackage,
                ),
            ),
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

        return new DamlLfExpression({});
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
