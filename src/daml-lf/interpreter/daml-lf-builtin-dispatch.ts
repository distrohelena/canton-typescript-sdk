import { ValidationError } from "../../core/errors/validation-error.js";
import { IDamlLfRuntimeValue } from "./daml-lf-runtime-value.js";

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
                } satisfies IDamlLfRuntimeValue & { value: boolean };
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
}
