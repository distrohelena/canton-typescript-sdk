import { ValidationError } from "../../core/errors/validation-error.js";
import { IDamlLfRuntimeValue } from "./daml-lf-runtime-value.js";

interface IBooleanRuntimeValue extends IDamlLfRuntimeValue {
    readonly kind: "boolean";
    readonly value: boolean;
}

interface ITextRuntimeValue extends IDamlLfRuntimeValue {
    readonly kind: "text";
    readonly value: string;
}

interface IInt64RuntimeValue extends IDamlLfRuntimeValue {
    readonly kind: "int64";
    readonly value: string;
}

interface IBuiltinRuntimeValue extends IDamlLfRuntimeValue {
    readonly kind: "builtin";
    readonly builtinFunction: string;
    readonly appliedArguments: readonly IDamlLfRuntimeValue[];
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
                    kind: "text",
                    value: String(
                        this.readNumericLike(addNumericOperands[0]!)
                        + this.readNumericLike(addNumericOperands[1]!),
                    ),
                } satisfies ITextRuntimeValue;
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
                    kind: "text",
                    value: String(
                        this.readNumericLike(subNumericOperands[0]!)
                        - this.readNumericLike(subNumericOperands[1]!),
                    ),
                } satisfies ITextRuntimeValue;
            case "MUL_NUMERIC":
                if (numericArguments.length < 2) {
                    return {
                        kind: "builtin",
                        builtinFunction: builtin.builtinFunction,
                        appliedArguments,
                    } satisfies IBuiltinRuntimeValue;
                }

                const mulNumericOperands =
                    numericArguments.slice(-2);
                return {
                    kind: "text",
                    value: String(
                        this.readNumericLike(mulNumericOperands[0]!)
                        * this.readNumericLike(mulNumericOperands[1]!),
                    ),
                } satisfies ITextRuntimeValue;
            case "DIV_NUMERIC":
                if (numericArguments.length < 2) {
                    return {
                        kind: "builtin",
                        builtinFunction: builtin.builtinFunction,
                        appliedArguments,
                    } satisfies IBuiltinRuntimeValue;
                }

                const divNumericOperands =
                    numericArguments.slice(-2);
                return {
                    kind: "text",
                    value: String(
                        this.readNumericLike(divNumericOperands[0]!)
                        / this.readNumericLike(divNumericOperands[1]!),
                    ),
                } satisfies ITextRuntimeValue;
            case "INT64_TO_NUMERIC":
                if (numericArguments.length < 1) {
                    return {
                        kind: "builtin",
                        builtinFunction: builtin.builtinFunction,
                        appliedArguments,
                    } satisfies IBuiltinRuntimeValue;
                }

                return {
                    kind: "text",
                    value: String(this.readInt64(numericArguments.at(-1)!)),
                } satisfies ITextRuntimeValue;
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
                        Math.trunc(
                            this.readNumericLike(numericArguments.at(-1)!),
                        ),
                    ),
                } satisfies IInt64RuntimeValue;
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
                    value: this.readTextLike(nonUnitArguments[0]!),
                } satisfies ITextRuntimeValue;
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
        return JSON.stringify(left) === JSON.stringify(right);
    }

    private readInt64(value: IDamlLfRuntimeValue): bigint {
        if (value.kind !== "int64") {
            throw new ValidationError(
                `daml lf builtin expected int64, got '${value.kind}'`,
            );
        }

        return BigInt((value as IInt64RuntimeValue).value);
    }

    private compareValues(
        left: IDamlLfRuntimeValue,
        right: IDamlLfRuntimeValue,
    ): number {
        const leftNumber = this.readNumericLike(left);
        const rightNumber = this.readNumericLike(right);

        if (leftNumber < rightNumber) {
            return -1;
        }

        if (leftNumber > rightNumber) {
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

    private readTextLike(value: IDamlLfRuntimeValue): string {
        if (value.kind === "text" || value.kind === "int64") {
            return String((value as ITextRuntimeValue | IInt64RuntimeValue).value);
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

    private readNumericLike(value: IDamlLfRuntimeValue): number {
        if (value.kind === "int64") {
            return Number((value as IInt64RuntimeValue).value);
        }

        if (value.kind === "text") {
            return Number((value as ITextRuntimeValue).value);
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
            return Number(value.value);
        }

        throw new ValidationError(
            `daml lf builtin expected a numeric-compatible value, got '${value.kind}'`,
        );
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

    private isNumericCompatible(value: IDamlLfRuntimeValue): boolean {
        return (
            value.kind === "int64"
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
