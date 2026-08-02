import { CantonError } from "./canton-error.js";

export class ActiveContractsTraversalError extends CantonError {
    public readonly code:
        | "active-at-offset-mismatch"
        | "missing-active-at-offset"
        | "repeated-page-token"
        | "max-pages-exceeded"
        | "max-contracts-exceeded";

    public constructor(
        code: ActiveContractsTraversalError["code"],
        message: string,
    ) {
        super(message);
        this.code = code;
    }
}
