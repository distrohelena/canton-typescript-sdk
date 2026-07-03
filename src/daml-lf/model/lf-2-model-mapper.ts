import {
    BuiltinType,
    Expr,
    Package as LfArchivePackage,
    Type,
} from "../../transports/grpc/generated/canton/com/digitalasset/daml/lf/archive/daml_lf2.js";
import { DamlLfLanguageVersion } from "../decoding/daml-lf-language-version.js";
import { DamlLfDecodeException } from "../errors/daml-lf-decode.exception.js";
import { DamlLfBuiltinType } from "./daml-lf-builtin-type.js";
import { DamlLfExpression } from "./daml-lf-expression.js";
import { DamlLfModule } from "./daml-lf-module.js";
import { DamlLfPackage } from "./daml-lf-package.js";
import { DamlLfType } from "./daml-lf-type.js";
import { DamlLfValueDefinition } from "./daml-lf-value-definition.js";

export class Lf2ModelMapper {
    public static mapPackage(
        rawPackage: LfArchivePackage,
        languageVersion: DamlLfLanguageVersion,
    ): DamlLfPackage {
        return new DamlLfPackage({
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
                    new DamlLfModule({
                        name: Lf2ModelMapper.resolveInternedDottedName(
                            rawPackage.internedStrings,
                            rawPackage.internedDottedNames,
                            module.nameInternedDname,
                        ),
                        definitions: module.values.map(
                            (value) =>
                                new DamlLfValueDefinition({
                                    name: Lf2ModelMapper.resolveInternedDottedName(
                                        rawPackage.internedStrings,
                                        rawPackage.internedDottedNames,
                                        value.nameWithType?.nameInternedDname,
                                    ),
                                    type: Lf2ModelMapper.mapType(
                                        value.nameWithType?.type,
                                    ),
                                    expression: Lf2ModelMapper.mapExpression(
                                        value.expr,
                                        rawPackage.internedStrings,
                                    ),
                                }),
                        ),
                    }),
            ),
        });
    }

    private static mapType(rawType?: Type): DamlLfType {
        if (rawType?.sum.oneofKind === "builtin") {
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

    private static mapExpression(
        rawExpression: Expr | undefined,
        internedStrings: readonly string[],
    ): DamlLfExpression {
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
