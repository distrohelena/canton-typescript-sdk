import { LedgerCommand } from "../commands/ledger-command.js";
import { ValidationError } from "../../errors/validation-error.js";
import { DisclosedContract } from "../disclosed-contract.js";

export class SubmitCommandRequest {
    public readonly applicationId: string;
    public readonly userId?: string;
    public readonly actAs: readonly string[];
    public readonly readAs: readonly string[];
    public readonly command: LedgerCommand;
    public readonly disclosedContracts: readonly DisclosedContract[];
    public readonly synchronizerId?: string;

    public constructor(init: {
        applicationId: string;
        userId?: string;
        actAs: readonly string[];
        readAs?: readonly string[];
        command: LedgerCommand;
        disclosedContracts?: readonly DisclosedContract[];
        synchronizerId?: string;
    }) {
        if (init.actAs.length === 0) {
            throw new ValidationError(
                "submit requests require at least one actAs party",
            );
        }

        this.applicationId = init.applicationId;
        this.userId = init.userId;
        this.actAs = init.actAs;
        this.readAs = init.readAs ?? [];
        this.command = init.command;
        this.disclosedContracts = init.disclosedContracts ?? [];
        this.synchronizerId = init.synchronizerId;
    }
}
