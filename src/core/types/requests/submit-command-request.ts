import { LedgerCommand } from "../commands/ledger-command.js";
import { ValidationError } from "../../errors/validation-error.js";

export class SubmitCommandRequest {
    public readonly applicationId: string;
    public readonly actAs: readonly string[];
    public readonly readAs: readonly string[];
    public readonly command: LedgerCommand;

    public constructor(init: {
        applicationId: string;
        actAs: readonly string[];
        readAs?: readonly string[];
        command: LedgerCommand;
    }) {
        if (init.actAs.length === 0) {
            throw new ValidationError(
                "submit requests require at least one actAs party",
            );
        }

        this.applicationId = init.applicationId;
        this.actAs = init.actAs;
        this.readAs = init.readAs ?? [];
        this.command = init.command;
    }
}
