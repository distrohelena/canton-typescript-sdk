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
            case "greater":
                if (appliedArguments.length < 2) {
                    return {
                        kind: "builtin",
                        builtinFunction: builtin.builtinFunction,
                        appliedArguments,
                    } satisfies IBuiltinRuntimeValue;
                }

                return {
                    kind: "boolean",
                    value:
                        this.readInt64(appliedArguments[0]!)
                        > this.readInt64(appliedArguments[1]!),
                } satisfies IBooleanRuntimeValue;
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

    private readText(value: IDamlLfRuntimeValue): string {
        if (value.kind !== "text") {
            throw new ValidationError(
                `daml lf builtin expected text, got '${value.kind}'`,
            );
        }

        return (value as ITextRuntimeValue).value;
    }
}
