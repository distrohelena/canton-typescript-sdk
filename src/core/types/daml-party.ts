import { ValidationError } from "../errors/validation-error.js";

/** Explicit DAML Party value for commands whose field type is Party, not Text. */
export class DamlParty {
    public readonly value: string;

    public constructor(value: string) {
        if (value.length === 0) {
            throw new ValidationError("DAML party values must not be empty");
        }

        this.value = value;
    }

    public toJSON(): string {
        return this.value;
    }
}
