import { ValidationError } from "../../core/errors/validation-error.js";
import {
    DAML_LF_CONTRACT_ID_MARKER_KEY,
    DAML_LF_PARTY_MARKER_KEY,
    IDamlLfRuntimeValue,
} from "./daml-lf-runtime-value.js";

interface IBooleanRuntimeValue extends IDamlLfRuntimeValue {
    readonly kind: "boolean";
    readonly value: boolean;
}

interface ITextRuntimeValue extends IDamlLfRuntimeValue {
    readonly kind: "text";
    readonly value: string;
}

interface INumericRuntimeValue extends IDamlLfRuntimeValue {
    readonly kind: "numeric";
    readonly value: string;
}

interface IInt64RuntimeValue extends IDamlLfRuntimeValue {
    readonly kind: "int64";
    readonly value: string;
}

interface IPartyRuntimeValue extends IDamlLfRuntimeValue {
    readonly kind: "party";
    readonly value: string;
}

interface IContractIdRuntimeValue extends IDamlLfRuntimeValue {
    readonly kind: "contractId";
    readonly value: string;
}

interface IBuiltinRuntimeValue extends IDamlLfRuntimeValue {
    readonly kind: "builtin";
    readonly builtinFunction: string;
    readonly appliedArguments: readonly IDamlLfRuntimeValue[];
}

interface IExactDecimalValue {
    readonly significand: bigint;
    readonly scale: number;
}

export class DamlLfBuiltinDispatch {
    public applyOrThrow(
        builtin: IBuiltinRuntimeValue,
        argumentValues: readonly IDamlLfRuntimeValue[],
    ): IDamlLfRuntimeValue {
        const appliedArguments = [
            ...builtin.appliedArguments,
            ...argumentValues,
        ];
        const nonUnitArguments = appliedArguments.filter(
            (argument) => argument.kind !== "unit",
        );
        const numericArguments = appliedArguments.filter((argument) =>
            this.isNumericCompatible(argument),
        );

        switch (builtin.builtinFunction) {
            case "equal":
                if (appliedArguments.length < 2) {
                    return {
                        kind: "builtin",
                        builtinFunction: builtin.builtinFunction,
                        appliedArguments,
                    } satisfies IBuiltinRuntimeValue;
                }

                return {
                    kind: "boolean",
                    value: this.areEqual(
                        appliedArguments[0]!,
                        appliedArguments[1]!,
                    ),
                } satisfies IBooleanRuntimeValue;
            case "LESS":
                if (nonUnitArguments.length < 2) {
                    return {
                        kind: "builtin",
                        builtinFunction: builtin.builtinFunction,
                        appliedArguments,
                    } satisfies IBuiltinRuntimeValue;
                }

                return {
                    kind: "boolean",
                    value:
                        this.compareValues(
                            nonUnitArguments[0]!,
                            nonUnitArguments[1]!,
                        ) < 0,
                } satisfies IBooleanRuntimeValue;
            case "LESS_EQ":
                if (nonUnitArguments.length < 2) {
                    return {
                        kind: "builtin",
                        builtinFunction: builtin.builtinFunction,
                        appliedArguments,
                    } satisfies IBuiltinRuntimeValue;
                }

                return {
                    kind: "boolean",
                    value:
                        this.compareValues(
                            nonUnitArguments[0]!,
                            nonUnitArguments[1]!,
                        ) <= 0,
                } satisfies IBooleanRuntimeValue;
            case "ADD_INT64":
                if (nonUnitArguments.length < 2) {
                    return {
                        kind: "builtin",
                        builtinFunction: builtin.builtinFunction,
                        appliedArguments,
                    } satisfies IBuiltinRuntimeValue;
                }

                return {
                    kind: "int64",
                    value: String(
                        this.readInt64(nonUnitArguments[0]!)
                        + this.readInt64(nonUnitArguments[1]!),
                    ),
                } satisfies IInt64RuntimeValue;
            case "SUB_INT64":
                if (nonUnitArguments.length < 2) {
                    return {
                        kind: "builtin",
                        builtinFunction: builtin.builtinFunction,
                        appliedArguments,
                    } satisfies IBuiltinRuntimeValue;
                }

                return {
                    kind: "int64",
                    value: String(
                        this.readInt64(nonUnitArguments[0]!)
                        - this.readInt64(nonUnitArguments[1]!),
                    ),
                } satisfies IInt64RuntimeValue;
            case "GREATER_EQ":
                if (nonUnitArguments.length < 2) {
                    return {
                        kind: "builtin",
                        builtinFunction: builtin.builtinFunction,
                        appliedArguments,
                    } satisfies IBuiltinRuntimeValue;
                }

                return {
                    kind: "boolean",
                    value:
                        this.compareValues(
                            nonUnitArguments[0]!,
                            nonUnitArguments[1]!,
                        ) >= 0,
                } satisfies IBooleanRuntimeValue;
            case "greater":
            case "GREATER":
                if (nonUnitArguments.length < 2) {
                    return {
                        kind: "builtin",
                        builtinFunction: builtin.builtinFunction,
                        appliedArguments,
                    } satisfies IBuiltinRuntimeValue;
                }

                return {
                    kind: "boolean",
                    value:
                        this.compareValues(
                            nonUnitArguments[0]!,
                            nonUnitArguments[1]!,
                        ) > 0,
                } satisfies IBooleanRuntimeValue;
            case "ADD_NUMERIC":
                if (numericArguments.length < 2) {
                    return {
                        kind: "builtin",
                        builtinFunction: builtin.builtinFunction,
                        appliedArguments,
                    } satisfies IBuiltinRuntimeValue;
                }

                const addNumericOperands =
                    numericArguments.slice(-2);
                return {
                    kind: "numeric",
                    value: this.formatExactDecimal(
                        this.addExactDecimals(
                            this.readExactDecimal(addNumericOperands[0]!),
                            this.readExactDecimal(addNumericOperands[1]!),
                        ),
                    ),
                } satisfies INumericRuntimeValue;
            case "SUB_NUMERIC":
                if (numericArguments.length < 2) {
                    return {
                        kind: "builtin",
                        builtinFunction: builtin.builtinFunction,
                        appliedArguments,
                    } satisfies IBuiltinRuntimeValue;
                }

                const subNumericOperands =
                    numericArguments.slice(-2);
                return {
                    kind: "numeric",
                    value: this.formatExactDecimal(
                        this.subtractExactDecimals(
                            this.readExactDecimal(subNumericOperands[0]!),
                            this.readExactDecimal(subNumericOperands[1]!),
                        ),
                    ),
                } satisfies INumericRuntimeValue;
            case "MUL_NUMERIC":
                if (numericArguments.length < 3) {
                    return {
                        kind: "builtin",
                        builtinFunction: builtin.builtinFunction,
                        appliedArguments,
                    } satisfies IBuiltinRuntimeValue;
                }

                const mulNumericScale = this.readNumericScaleWitnessOrThrow(
                    numericArguments[0]!,
                );
                return {
                    kind: "numeric",
                    value: this.formatExactNumeric(
                        this.quantizeExactDecimal(
                            this.multiplyExactDecimals(
                                this.readExactDecimal(numericArguments[1]!),
                                this.readExactDecimal(numericArguments[2]!),
                            ),
                            mulNumericScale,
                            "halfEven",
                        ),
                        mulNumericScale,
                    ),
                } satisfies INumericRuntimeValue;
            case "DIV_NUMERIC":
                if (numericArguments.length < 3) {
                    return {
                        kind: "builtin",
                        builtinFunction: builtin.builtinFunction,
                        appliedArguments,
                    } satisfies IBuiltinRuntimeValue;
                }

                const divNumericScale = this.readNumericScaleWitnessOrThrow(
                    numericArguments[0]!,
                );
                return {
                    kind: "numeric",
                    value: this.formatExactNumeric(
                        this.divideExactDecimals(
                            this.readExactDecimal(numericArguments[1]!),
                            this.readExactDecimal(numericArguments[2]!),
                            divNumericScale,
                        ),
                        divNumericScale,
                    ),
                } satisfies INumericRuntimeValue;
            case "INT64_TO_NUMERIC":
                if (numericArguments.length < 2) {
                    return {
                        kind: "builtin",
                        builtinFunction: builtin.builtinFunction,
                        appliedArguments,
                    } satisfies IBuiltinRuntimeValue;
                }

                const int64ToNumericScale = this.readNumericScaleWitnessOrThrow(
                    numericArguments[0]!,
                );
                return {
                    kind: "numeric",
                    value: this.formatExactNumeric(
                        this.quantizeExactDecimal(
                            {
                                significand: this.readInt64(numericArguments[1]!),
                                scale: 0,
                            },
                            int64ToNumericScale,
                            "unnecessary",
                        ),
                        int64ToNumericScale,
                    ),
                } satisfies INumericRuntimeValue;
            case "NUMERIC_TO_INT64":
                if (numericArguments.length < 1) {
                    return {
                        kind: "builtin",
                        builtinFunction: builtin.builtinFunction,
                        appliedArguments,
                    } satisfies IBuiltinRuntimeValue;
                }

                return {
                    kind: "int64",
                    value: String(
                        this.truncateExactDecimalToInt64(
                            this.readExactDecimal(numericArguments.at(-1)!),
                        ),
                    ),
                } satisfies IInt64RuntimeValue;
            case "CAST_NUMERIC":
                if (numericArguments.length < 2) {
                    return {
                        kind: "builtin",
                        builtinFunction: builtin.builtinFunction,
                        appliedArguments,
                    } satisfies IBuiltinRuntimeValue;
                }

                const castNumericScale = this.readNumericScaleWitnessOrThrow(
                    numericArguments[0]!,
                );
                return {
                    kind: "numeric",
                    value: this.formatExactNumeric(
                        this.quantizeExactDecimal(
                            this.readExactDecimal(numericArguments[1]!),
                            castNumericScale,
                            "unnecessary",
                        ),
                        castNumericScale,
                    ),
                } satisfies INumericRuntimeValue;
            case "SHIFT_NUMERIC":
                if (numericArguments.length < 2) {
                    return {
                        kind: "builtin",
                        builtinFunction: builtin.builtinFunction,
                        appliedArguments,
                    } satisfies IBuiltinRuntimeValue;
                }

                const shiftNumericScale = this.readNumericScaleWitnessOrThrow(
                    numericArguments[0]!,
                );
                return {
                    kind: "numeric",
                    value: this.formatExactNumeric(
                        this.shiftExactDecimal(
                            this.readExactDecimal(numericArguments[1]!),
                            shiftNumericScale,
                        ),
                        shiftNumericScale,
                    ),
                } satisfies INumericRuntimeValue;
            case "ROUND_NUMERIC":
                if (appliedArguments.length < 2) {
                    return {
                        kind: "builtin",
                        builtinFunction: builtin.builtinFunction,
                        appliedArguments,
                    } satisfies IBuiltinRuntimeValue;
                }

                const roundNumericScale = Number(
                    this.readInt64(appliedArguments[0]!),
                );
                return {
                    kind: "numeric",
                    value: this.formatExactDecimal(
                        this.quantizeExactDecimal(
                            this.readExactDecimal(appliedArguments[1]!),
                            roundNumericScale,
                            "halfEven",
                        ),
                    ),
                } satisfies INumericRuntimeValue;
            case "INT64_TO_TEXT":
                if (nonUnitArguments.length < 1) {
                    return {
                        kind: "builtin",
                        builtinFunction: builtin.builtinFunction,
                        appliedArguments,
                    } satisfies IBuiltinRuntimeValue;
                }

                return {
                    kind: "text",
                    value: String(this.readInt64(nonUnitArguments[0]!)),
                } satisfies ITextRuntimeValue;
            case "PARTY_TO_TEXT":
                if (nonUnitArguments.length < 1) {
                    return {
                        kind: "builtin",
                        builtinFunction: builtin.builtinFunction,
                        appliedArguments,
                    } satisfies IBuiltinRuntimeValue;
                }

                return {
                    kind: "text",
                    value: this.readPartyLike(nonUnitArguments[0]!),
                } satisfies ITextRuntimeValue;
            case "COERCE_CONTRACT_ID":
                if (nonUnitArguments.length < 1) {
                    return {
                        kind: "builtin",
                        builtinFunction: builtin.builtinFunction,
                        appliedArguments,
                    } satisfies IBuiltinRuntimeValue;
                }

                return {
                    kind: "contractId",
                    value: this.readContractIdLike(nonUnitArguments[0]!),
                } satisfies IContractIdRuntimeValue;
            case "TEXTMAP_EMPTY":
                return {
                    kind: "ledgerValue",
                    value: {},
                } satisfies IDamlLfRuntimeValue;
            case "TEXTMAP_INSERT":
                if (appliedArguments.length < 3) {
                    return {
                        kind: "builtin",
                        builtinFunction: builtin.builtinFunction,
                        appliedArguments,
                    } satisfies IBuiltinRuntimeValue;
                }

                return {
                    kind: "ledgerValue",
                    value: {
                        ...this.readTextMap(appliedArguments[2]!),
                        [this.readText(appliedArguments[0]!)]: this.unwrapValue(
                            appliedArguments[1]!,
                        ),
                    },
                } satisfies IDamlLfRuntimeValue;
            case "TEXTMAP_LOOKUP":
                if (appliedArguments.length < 2) {
                    return {
                        kind: "builtin",
                        builtinFunction: builtin.builtinFunction,
                        appliedArguments,
                    } satisfies IBuiltinRuntimeValue;
                }

                const textMapLookupValue = this.readTextMap(appliedArguments[1]!)[
                    this.readText(appliedArguments[0]!)
                ];

                return textMapLookupValue === undefined
                    ? ({
                        kind: "unit",
                    } satisfies IDamlLfRuntimeValue)
                    : this.hydrateValue(textMapLookupValue);
            case "TEXTMAP_DELETE":
                if (appliedArguments.length < 2) {
                    return {
                        kind: "builtin",
                        builtinFunction: builtin.builtinFunction,
                        appliedArguments,
                    } satisfies IBuiltinRuntimeValue;
                }

                const textMapAfterDelete = {
                    ...this.readTextMap(appliedArguments[1]!),
                };
                delete textMapAfterDelete[this.readText(appliedArguments[0]!)];

                return {
                    kind: "ledgerValue",
                    value: textMapAfterDelete,
                } satisfies IDamlLfRuntimeValue;
            case "TEXTMAP_TO_LIST":
                if (appliedArguments.length < 1) {
                    return {
                        kind: "builtin",
                        builtinFunction: builtin.builtinFunction,
                        appliedArguments,
                    } satisfies IBuiltinRuntimeValue;
                }

                return {
                    kind: "ledgerValue",
                    value: Object.entries(this.readTextMap(appliedArguments[0]!)).map(
                        ([key, value]) => ({
                            "0": key,
                            "1": value,
                        }),
                    ),
                } satisfies IDamlLfRuntimeValue;
            case "TEXTMAP_SIZE":
                if (appliedArguments.length < 1) {
                    return {
                        kind: "builtin",
                        builtinFunction: builtin.builtinFunction,
                        appliedArguments,
                    } satisfies IBuiltinRuntimeValue;
                }

                return {
                    kind: "int64",
                    value: String(
                        Object.keys(this.readTextMap(appliedArguments[0]!)).length,
                    ),
                } satisfies IInt64RuntimeValue;
            case "GENMAP_EMPTY":
                return {
                    kind: "ledgerValue",
                    value: [],
                } satisfies IDamlLfRuntimeValue;
            case "GENMAP_INSERT":
                if (appliedArguments.length < 3) {
                    return {
                        kind: "builtin",
                        builtinFunction: builtin.builtinFunction,
                        appliedArguments,
                    } satisfies IBuiltinRuntimeValue;
                }

                return {
                    kind: "ledgerValue",
                    value: this.insertGenMapEntry(
                        this.readGenMap(appliedArguments[2]!),
                        appliedArguments[0]!,
                        appliedArguments[1]!,
                    ),
                } satisfies IDamlLfRuntimeValue;
            case "GENMAP_LOOKUP":
                if (appliedArguments.length < 2) {
                    return {
                        kind: "builtin",
                        builtinFunction: builtin.builtinFunction,
                        appliedArguments,
                    } satisfies IBuiltinRuntimeValue;
                }

                const matchingGenMapEntry = this.readGenMap(
                    appliedArguments[1]!,
                ).find((entry) =>
                    this.areEqual(
                        this.hydrateValue(entry.key),
                        appliedArguments[0]!,
                    ),
                );

                return matchingGenMapEntry === undefined
                    ? ({
                        kind: "unit",
                    } satisfies IDamlLfRuntimeValue)
                    : this.hydrateValue(matchingGenMapEntry.value);
            case "GENMAP_DELETE":
                if (appliedArguments.length < 2) {
                    return {
                        kind: "builtin",
                        builtinFunction: builtin.builtinFunction,
                        appliedArguments,
                    } satisfies IBuiltinRuntimeValue;
                }

                return {
                    kind: "ledgerValue",
                    value: this.readGenMap(appliedArguments[1]!).filter((entry) =>
                        !this.areEqual(
                            this.hydrateValue(entry.key),
                            appliedArguments[0]!,
                        ),
                    ),
                } satisfies IDamlLfRuntimeValue;
            case "GENMAP_KEYS":
                if (appliedArguments.length < 1) {
                    return {
                        kind: "builtin",
                        builtinFunction: builtin.builtinFunction,
                        appliedArguments,
                    } satisfies IBuiltinRuntimeValue;
                }

                return {
                    kind: "ledgerValue",
                    value: this.readGenMap(appliedArguments[0]!).map((entry) => entry.key),
                } satisfies IDamlLfRuntimeValue;
            case "GENMAP_VALUES":
                if (appliedArguments.length < 1) {
                    return {
                        kind: "builtin",
                        builtinFunction: builtin.builtinFunction,
                        appliedArguments,
                    } satisfies IBuiltinRuntimeValue;
                }

                return {
                    kind: "ledgerValue",
                    value: this.readGenMap(appliedArguments[0]!).map(
                        (entry) => entry.value,
                    ),
                } satisfies IDamlLfRuntimeValue;
            case "GENMAP_SIZE":
                if (appliedArguments.length < 1) {
                    return {
                        kind: "builtin",
                        builtinFunction: builtin.builtinFunction,
                        appliedArguments,
                    } satisfies IBuiltinRuntimeValue;
                }

                return {
                    kind: "int64",
                    value: String(this.readGenMap(appliedArguments[0]!).length),
                } satisfies IInt64RuntimeValue;
            case "appendText":
                if (appliedArguments.length < 2) {
                    return {
                        kind: "builtin",
                        builtinFunction: builtin.builtinFunction,
                        appliedArguments,
                    } satisfies IBuiltinRuntimeValue;
                }

                return {
                    kind: "text",
                    value:
                        this.readText(appliedArguments[0]!)
                        + this.readText(appliedArguments[1]!),
                } satisfies ITextRuntimeValue;
            case "EXPLODE_TEXT":
                if (nonUnitArguments.length < 1) {
                    return {
                        kind: "builtin",
                        builtinFunction: builtin.builtinFunction,
                        appliedArguments,
                    } satisfies IBuiltinRuntimeValue;
                }

                return {
                    kind: "ledgerValue",
                    value: [...this.readText(nonUnitArguments.at(-1)!)],
                } satisfies IDamlLfRuntimeValue;
            case "IMPLODE_TEXT":
                if (nonUnitArguments.length < 1) {
                    return {
                        kind: "builtin",
                        builtinFunction: builtin.builtinFunction,
                        appliedArguments,
                    } satisfies IBuiltinRuntimeValue;
                }

                return {
                    kind: "text",
                    value: this.readTextList(nonUnitArguments.at(-1)!).join(""),
                } satisfies ITextRuntimeValue;
            case "NUMERIC_TO_TEXT":
                if (appliedArguments.length < 1) {
                    return {
                        kind: "builtin",
                        builtinFunction: builtin.builtinFunction,
                        appliedArguments,
                    } satisfies IBuiltinRuntimeValue;
                }

                const numericArgument = numericArguments.at(-1);

                if (numericArgument === undefined) {
                    return {
                        kind: "builtin",
                        builtinFunction: builtin.builtinFunction,
                        appliedArguments,
                    } satisfies IBuiltinRuntimeValue;
                }

                return {
                    kind: "text",
                    value: this.readTextLike(numericArgument),
                } satisfies ITextRuntimeValue;
            default:
                throw new ValidationError(
                    `daml lf builtin '${builtin.builtinFunction}' is not supported yet`,
                );
        }
    }

    private areEqual(
        left: IDamlLfRuntimeValue,
        right: IDamlLfRuntimeValue,
    ): boolean {
        const leftString = this.readStringLikeOrUndefined(left);
        const rightString = this.readStringLikeOrUndefined(right);

        if (leftString !== undefined && rightString !== undefined) {
            return leftString === rightString;
        }

        return JSON.stringify(left) === JSON.stringify(right);
    }

    private readInt64(value: IDamlLfRuntimeValue): bigint {
        if (value.kind === "int64") {
            return BigInt((value as IInt64RuntimeValue).value);
        }

        if (value.kind === "text") {
            return BigInt((value as ITextRuntimeValue).value);
        }

        if (
            value.kind === "ledgerValue"
            && "value" in value
            && (
                typeof value.value === "string"
                || typeof value.value === "number"
                || typeof value.value === "bigint"
            )
        ) {
            return BigInt(value.value);
        }

        throw new ValidationError(
            `daml lf builtin expected int64, got '${value.kind}'`,
        );
    }

    private compareValues(
        left: IDamlLfRuntimeValue,
        right: IDamlLfRuntimeValue,
    ): number {
        const leftDecimal = this.tryReadExactDecimal(left);
        const rightDecimal = this.tryReadExactDecimal(right);

        if (leftDecimal !== undefined && rightDecimal !== undefined) {
            return this.compareExactDecimals(leftDecimal, rightDecimal);
        }

        const leftString = this.readTextLike(left);
        const rightString = this.readTextLike(right);

        if (leftString < rightString) {
            return -1;
        }

        if (leftString > rightString) {
            return 1;
        }

        return 0;
    }

    private readText(value: IDamlLfRuntimeValue): string {
        if (value.kind !== "text") {
            throw new ValidationError(
                `daml lf builtin expected text, got '${value.kind}'`,
            );
        }

        return (value as ITextRuntimeValue).value;
    }

    private readPartyLike(value: IDamlLfRuntimeValue): string {
        if (value.kind === "party" || value.kind === "text") {
            return (value as IPartyRuntimeValue | ITextRuntimeValue).value;
        }

        if (
            value.kind === "ledgerValue"
            && "value" in value
            && typeof value.value === "string"
        ) {
            return value.value;
        }

        throw new ValidationError(
            `daml lf builtin expected party, got '${value.kind}'`,
        );
    }

    private readTextLike(value: IDamlLfRuntimeValue): string {
        if (
            value.kind === "text"
            || value.kind === "numeric"
            || value.kind === "int64"
        ) {
            return String(
                (value as ITextRuntimeValue | INumericRuntimeValue | IInt64RuntimeValue).value,
            );
        }

        if (
            value.kind === "ledgerValue"
            && "value" in value
            && (
                typeof value.value === "string"
                || typeof value.value === "number"
                || typeof value.value === "bigint"
            )
        ) {
            return String(value.value);
        }

        throw new ValidationError(
            `daml lf builtin expected a text-compatible value, got '${value.kind}'`,
        );
    }

    private readStringLikeOrUndefined(value: IDamlLfRuntimeValue): string | undefined {
        if (
            value.kind === "text"
            || value.kind === "numeric"
            || value.kind === "party"
            || value.kind === "int64"
        ) {
            return String(
                (
                    value as
                        | ITextRuntimeValue
                        | INumericRuntimeValue
                        | IPartyRuntimeValue
                        | IInt64RuntimeValue
                ).value,
            );
        }

        if (
            value.kind === "ledgerValue"
            && "value" in value
            && typeof value.value === "string"
        ) {
            return value.value;
        }

        return undefined;
    }

    private readContractIdLike(value: IDamlLfRuntimeValue): string {
        if (
            value.kind === "contractId"
            || value.kind === "text"
        ) {
            return String((value as IContractIdRuntimeValue | ITextRuntimeValue).value);
        }

        if (
            value.kind === "ledgerValue"
            && "contractId" in value
            && typeof value.contractId === "string"
        ) {
            return value.contractId;
        }

        if (
            value.kind === "ledgerValue"
            && "value" in value
            && value.value !== null
            && typeof value.value === "object"
            && DAML_LF_CONTRACT_ID_MARKER_KEY in value.value
            && typeof value.value[DAML_LF_CONTRACT_ID_MARKER_KEY] === "string"
        ) {
            return value.value[DAML_LF_CONTRACT_ID_MARKER_KEY];
        }

        throw new ValidationError(
            `daml lf builtin expected contract id, got '${value.kind}'`,
        );
    }

    private readExactDecimal(value: IDamlLfRuntimeValue): IExactDecimalValue {
        if (value.kind === "numeric") {
            return this.parseExactDecimal((value as INumericRuntimeValue).value);
        }

        return this.parseExactDecimal(this.readTextLike(value));
    }

    private tryReadExactDecimal(
        value: IDamlLfRuntimeValue,
    ): IExactDecimalValue | undefined {
        try {
            return this.readExactDecimal(value);
        } catch {
            return undefined;
        }
    }

    private parseExactDecimal(value: string): IExactDecimalValue {
        const trimmed = value.trim();

        if (!/^-?\d+(?:\.\d+)?$/.test(trimmed)) {
            throw new ValidationError(
                `daml lf builtin expected an exact decimal-compatible value, got '${value}'`,
            );
        }

        const negative = trimmed.startsWith("-");
        const unsigned = negative ? trimmed.slice(1) : trimmed;
        const [integerPart, fractionalPart = ""] = unsigned.split(".");
        const normalizedInteger = integerPart.replace(/^0+(?=\d)/, "") || "0";
        const normalizedFraction = fractionalPart.replace(/0+$/, "");
        const scale = normalizedFraction.length;
        const digits = `${normalizedInteger}${normalizedFraction}`.replace(
            /^0+(?=\d)/,
            "",
        ) || "0";
        const significand = BigInt(negative ? `-${digits}` : digits);

        return {
            significand,
            scale,
        };
    }

    private addExactDecimals(
        left: IExactDecimalValue,
        right: IExactDecimalValue,
    ): IExactDecimalValue {
        const scale = Math.max(left.scale, right.scale);

        return this.normalizeExactDecimal({
            significand:
                left.significand * this.pow10(scale - left.scale)
                + right.significand * this.pow10(scale - right.scale),
            scale,
        });
    }

    private subtractExactDecimals(
        left: IExactDecimalValue,
        right: IExactDecimalValue,
    ): IExactDecimalValue {
        const scale = Math.max(left.scale, right.scale);

        return this.normalizeExactDecimal({
            significand:
                left.significand * this.pow10(scale - left.scale)
                - right.significand * this.pow10(scale - right.scale),
            scale,
        });
    }

    private multiplyExactDecimals(
        left: IExactDecimalValue,
        right: IExactDecimalValue,
    ): IExactDecimalValue {
        return this.normalizeExactDecimal({
            significand: left.significand * right.significand,
            scale: left.scale + right.scale,
        });
    }

    private divideExactDecimals(
        left: IExactDecimalValue,
        right: IExactDecimalValue,
        targetScale: number,
    ): IExactDecimalValue {
        if (right.significand === 0n) {
            throw new ValidationError(
                "daml lf builtin DIV_NUMERIC cannot divide by zero",
            );
        }

        const exponent = targetScale + right.scale - left.scale;
        const scaleFactor = this.pow10(Math.max(exponent, 0));
        const dividend =
            exponent >= 0
                ? left.significand * scaleFactor
                : left.significand;
        const divisor =
            exponent >= 0
                ? right.significand
                : right.significand * this.pow10(-exponent);

        return this.assertNumericBoundsOrThrow(
            this.quantizeQuotientToScale(
                dividend,
                divisor,
                targetScale,
                "halfEven",
            ),
            targetScale,
        );
    }

    private compareExactDecimals(
        left: IExactDecimalValue,
        right: IExactDecimalValue,
    ): number {
        const scale = Math.max(left.scale, right.scale);
        const leftValue =
            left.significand * this.pow10(scale - left.scale);
        const rightValue =
            right.significand * this.pow10(scale - right.scale);

        if (leftValue < rightValue) {
            return -1;
        }

        if (leftValue > rightValue) {
            return 1;
        }

        return 0;
    }

    private normalizeExactDecimal(value: IExactDecimalValue): IExactDecimalValue {
        let significand = value.significand;
        let scale = value.scale;

        while (scale > 0 && significand % 10n === 0n) {
            significand /= 10n;
            scale -= 1;
        }

        return {
            significand,
            scale,
        };
    }

    private quantizeExactDecimal(
        value: IExactDecimalValue,
        targetScale: number,
        roundingMode: "halfEven" | "unnecessary",
    ): IExactDecimalValue {
        if (targetScale >= value.scale) {
            const scaledValue = this.normalizeExactDecimal({
                significand:
                    value.significand * this.pow10(targetScale - value.scale),
                scale: targetScale,
            });

            return this.assertNumericBoundsOrThrow(scaledValue, targetScale);
        }

        const delta = value.scale - targetScale;
        const divisor = this.pow10(delta);
        const truncated = value.significand / divisor;
        const remainder = value.significand % divisor;

        if (remainder === 0n) {
            return this.assertNumericBoundsOrThrow(
                this.createExactDecimalFromScaledSignificand(
                    truncated,
                    targetScale,
                ),
                targetScale,
            );
        }

        if (roundingMode === "unnecessary") {
            throw new ValidationError(
                "daml lf builtin CAST_NUMERIC requires an exact representation",
            );
        }

        const rounded = this.roundHalfEvenQuotient(
            truncated,
            remainder,
            divisor,
        );

        return this.assertNumericBoundsOrThrow(
            this.createExactDecimalFromScaledSignificand(
                rounded,
                targetScale,
            ),
            targetScale,
        );
    }

    private shiftExactDecimal(
        value: IExactDecimalValue,
        targetScale: number,
    ): IExactDecimalValue {
        return this.assertNumericBoundsOrThrow(
            this.normalizeExactDecimal({
                significand: value.significand,
                scale: targetScale,
            }),
            targetScale,
        );
    }

    private quantizeQuotientToScale(
        dividend: bigint,
        divisor: bigint,
        targetScale: number,
        roundingMode: "halfEven" | "unnecessary",
    ): IExactDecimalValue {
        const quotient = dividend / divisor;
        const remainder = dividend % divisor;

        if (remainder === 0n) {
            return this.createExactDecimalFromScaledSignificand(
                quotient,
                targetScale,
            );
        }

        if (roundingMode === "unnecessary") {
            throw new ValidationError(
                "daml lf builtin DIV_NUMERIC requires an exact representation",
            );
        }

        return this.createExactDecimalFromScaledSignificand(
            this.roundHalfEvenQuotient(
                quotient,
                remainder,
                divisor,
            ),
            targetScale,
        );
    }

    private roundHalfEvenQuotient(
        quotient: bigint,
        remainder: bigint,
        divisor: bigint,
    ): bigint {
        const absoluteRemainder =
            remainder < 0n ? -remainder : remainder;
        const absoluteDivisor = divisor < 0n ? -divisor : divisor;
        const doubledRemainder = absoluteRemainder * 2n;

        if (doubledRemainder < absoluteDivisor) {
            return quotient;
        }

        const shouldRoundAwayFromZero =
            doubledRemainder > absoluteDivisor
            || quotient % 2n !== 0n;

        if (!shouldRoundAwayFromZero) {
            return quotient;
        }

        const direction =
            quotient !== 0n
                ? (quotient < 0n ? -1n : 1n)
                : (
                    (remainder < 0n) !== (divisor < 0n)
                        ? -1n
                        : 1n
                );

        return quotient + direction;
    }

    private createExactDecimalFromScaledSignificand(
        significand: bigint,
        scale: number,
    ): IExactDecimalValue {
        if (scale >= 0) {
            return this.normalizeExactDecimal({
                significand,
                scale,
            });
        }

        return this.normalizeExactDecimal({
            significand: significand * this.pow10(-scale),
            scale: 0,
        });
    }

    private formatExactDecimal(value: IExactDecimalValue): string {
        const normalized = this.normalizeExactDecimal(value);
        const negative = normalized.significand < 0n;
        const digits = (negative
            ? -normalized.significand
            : normalized.significand).toString();

        if (normalized.scale === 0) {
            return `${negative ? "-" : ""}${digits}`;
        }

        const paddedDigits = digits.padStart(normalized.scale + 1, "0");
        const splitIndex = paddedDigits.length - normalized.scale;
        const integerPart = paddedDigits.slice(0, splitIndex);
        const fractionalPart = paddedDigits.slice(splitIndex);

        return `${negative ? "-" : ""}${integerPart}.${fractionalPart}`;
    }

    private formatExactNumeric(
        value: IExactDecimalValue,
        _targetScale: number,
    ): string {
        return this.formatExactDecimal(value);
    }

    private truncateExactDecimalToInt64(value: IExactDecimalValue): bigint {
        if (value.scale === 0) {
            return value.significand;
        }

        return value.significand / this.pow10(value.scale);
    }

    private readNumericScaleWitnessOrThrow(value: IDamlLfRuntimeValue): number {
        const text = this.readTextLike(value).trim();
        const match = /^-?\d+(?:\.(\d+))?$/.exec(text);

        if (match === null) {
            throw new ValidationError(
                `daml lf builtin expected a numeric scale witness, got '${text}'`,
            );
        }

        return match[1]?.length ?? 0;
    }

    private assertNumericBoundsOrThrow(
        value: IExactDecimalValue,
        targetScale?: number,
    ): IExactDecimalValue {
        const normalized = this.normalizeExactDecimal(value);
        const scaledSignificand =
            targetScale !== undefined
            && targetScale >= 0
            && targetScale >= normalized.scale
                ? normalized.significand * this.pow10(targetScale - normalized.scale)
                : normalized.significand;
        const digits = (scaledSignificand < 0n
            ? -scaledSignificand
            : scaledSignificand).toString().length;

        if (digits > 38) {
            throw new ValidationError("daml lf numeric overflow");
        }

        return normalized;
    }

    private pow10(exponent: number): bigint {
        return 10n ** BigInt(exponent);
    }

    private readTextList(value: IDamlLfRuntimeValue): readonly string[] {
        if (
            value.kind === "ledgerValue"
            && "value" in value
            && Array.isArray(value.value)
        ) {
            return value.value.map((item) => {
                if (typeof item !== "string") {
                    throw new ValidationError(
                        "daml lf builtin expected a text list",
                    );
                }

                return item;
            });
        }

        throw new ValidationError(
            `daml lf builtin expected a text-list-compatible value, got '${value.kind}'`,
        );
    }

    private readTextMap(
        value: IDamlLfRuntimeValue,
    ): Readonly<Record<string, unknown>> {
        if (
            value.kind === "builtin"
            && "builtinFunction" in value
            && value.builtinFunction === "TEXTMAP_EMPTY"
        ) {
            const builtinValue = value as unknown as IBuiltinRuntimeValue;

            if (builtinValue.appliedArguments.length === 0) {
                return {};
            }
        }

        if (
            value.kind === "ledgerValue"
            && "value" in value
            && value.value !== null
            && typeof value.value === "object"
            && !Array.isArray(value.value)
        ) {
            return value.value as Record<string, unknown>;
        }

        throw new ValidationError(
            `daml lf builtin expected a text-map-compatible value, got '${value.kind}'`,
        );
    }

    private readGenMap(
        value: IDamlLfRuntimeValue,
    ): readonly Readonly<{ key: unknown; value: unknown }>[] {
        if (
            value.kind === "builtin"
            && "builtinFunction" in value
            && value.builtinFunction === "GENMAP_EMPTY"
        ) {
            const builtinValue = value as unknown as IBuiltinRuntimeValue;

            if (builtinValue.appliedArguments.length === 0) {
                return [];
            }
        }

        if (
            value.kind === "ledgerValue"
            && "value" in value
            && Array.isArray(value.value)
        ) {
            return value.value.map((entry) => {
                if (
                    entry === null
                    || typeof entry !== "object"
                    || !("key" in entry)
                    || !("value" in entry)
                ) {
                    throw new ValidationError("daml lf builtin expected a gen-map entry");
                }

                return entry as { key: unknown; value: unknown };
            });
        }

        throw new ValidationError(
            `daml lf builtin expected a gen-map-compatible value, got '${value.kind}'`,
        );
    }

    private unwrapValue(value: IDamlLfRuntimeValue): unknown {
        if (value.kind === "record" && "fields" in value) {
            const recordFields =
                (value as unknown as {
                    fields: Readonly<Record<string, IDamlLfRuntimeValue>>;
                }).fields;

            return Object.fromEntries(
                Object.entries(recordFields).map(([fieldName, fieldValue]) => [
                    fieldName,
                    this.unwrapValue(fieldValue),
                ]),
            );
        }

        if (value.kind === "contractId") {
            return {
                [DAML_LF_CONTRACT_ID_MARKER_KEY]: value.value,
            };
        }

        if (value.kind === "party") {
            return {
                [DAML_LF_PARTY_MARKER_KEY]: value.value,
            };
        }

        if (value.kind === "unit") {
            return null;
        }

        if ("value" in value) {
            return value.value;
        }

        return value;
    }

    private hydrateValue(value: unknown): IDamlLfRuntimeValue {
        if (value === null || value === undefined) {
            return {
                kind: "unit",
            } satisfies IDamlLfRuntimeValue;
        }

        if (typeof value === "string") {
            return {
                kind: "text",
                value,
            } satisfies ITextRuntimeValue;
        }

        if (typeof value === "boolean") {
            return {
                kind: "boolean",
                value,
            } satisfies IBooleanRuntimeValue;
        }

        if (typeof value === "number" || typeof value === "bigint") {
            return {
                kind: "text",
                value: String(value),
            } satisfies ITextRuntimeValue;
        }

        if (
            typeof value === "object"
            && value !== null
            && DAML_LF_CONTRACT_ID_MARKER_KEY in value
            && typeof value[DAML_LF_CONTRACT_ID_MARKER_KEY] === "string"
        ) {
            return {
                kind: "contractId",
                value: value[DAML_LF_CONTRACT_ID_MARKER_KEY],
            } satisfies IContractIdRuntimeValue;
        }

        if (
            typeof value === "object"
            && value !== null
            && DAML_LF_PARTY_MARKER_KEY in value
            && typeof value[DAML_LF_PARTY_MARKER_KEY] === "string"
        ) {
            return {
                kind: "party",
                value: value[DAML_LF_PARTY_MARKER_KEY],
            } satisfies IPartyRuntimeValue;
        }

        return {
            kind: "ledgerValue",
            value,
        } satisfies IDamlLfRuntimeValue;
    }

    private insertGenMapEntry(
        entries: readonly Readonly<{ key: unknown; value: unknown }>[],
        key: IDamlLfRuntimeValue,
        value: IDamlLfRuntimeValue,
    ): readonly Readonly<{ key: unknown; value: unknown }>[] {
        const unwrappedKey = this.unwrapValue(key);
        const nextEntry = {
            key: unwrappedKey,
            value: this.unwrapValue(value),
        };

        const retainedEntries = entries.filter(
            (entry) => !this.areEqual(this.hydrateValue(entry.key), key),
        );

        return [...retainedEntries, nextEntry];
    }

    private isNumericCompatible(value: IDamlLfRuntimeValue): boolean {
        return (
            value.kind === "int64"
            || value.kind === "numeric"
            || value.kind === "text"
            || (
                value.kind === "ledgerValue"
                && "value" in value
                && (
                    typeof value.value === "string"
                    || typeof value.value === "number"
                    || typeof value.value === "bigint"
                )
            )
        );
    }
}
