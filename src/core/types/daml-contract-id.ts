import { ValidationError } from "../errors/validation-error.js";

/** Explicit DAML contract-id value, distinguished from ordinary text. */
export class DamlContractId {
    public readonly value: string;

    public constructor(value: string) {
        if (value.length === 0) {
            throw new ValidationError("DAML contract ids must not be empty");
        }
        this.value = value;
    }
}
