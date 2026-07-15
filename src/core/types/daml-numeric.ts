import { ValidationError } from "../errors/validation-error.js";

/** Exact decimal DAML Numeric value, encoded without floating-point rounding. */
export class DamlNumeric {
    public readonly value: string;

    public constructor(value: string) {
        if (!/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)) {
            throw new ValidationError("DAML numeric values must be exact decimal strings");
        }

        this.value = value;
    }

    public toJSON(): string {
        return this.value;
    }
}
