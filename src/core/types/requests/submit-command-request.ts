import { LedgerCommand } from "../commands/ledger-command.js";
import { ValidationError } from "../../errors/validation-error.js";
import { DisclosedContract } from "../disclosed-contract.js";
import { CommandDeduplicationPeriod } from "../command-deduplication-period.js";

const ledgerStringPattern = /^[A-Za-z0-9#:\-_/ ]+$/;
const canonicalOffsetPattern = /^(0|[1-9][0-9]*)$/;
const maximumInt64Offset = "9223372036854775807";

export class SubmitCommandRequest {
    public readonly applicationId: string;
    public readonly userId?: string;
    public readonly actAs: readonly string[];
    public readonly readAs: readonly string[];
    public readonly command: LedgerCommand;
    public readonly commandId?: string;
    public readonly deduplicationPeriod?: CommandDeduplicationPeriod;
    public readonly disclosedContracts: readonly DisclosedContract[];
    public readonly synchronizerId?: string;

    public constructor(init: {
        applicationId: string;
        userId?: string;
        actAs: readonly string[];
        readAs?: readonly string[];
        command: LedgerCommand;
        commandId?: string;
        deduplicationPeriod?: CommandDeduplicationPeriod;
        disclosedContracts?: readonly DisclosedContract[];
        synchronizerId?: string;
    }) {
        if (init.actAs.length === 0) {
            throw new ValidationError(
                "submit requests require at least one actAs party",
            );
        }

        if (
            init.commandId !== undefined &&
            (typeof init.commandId !== "string" ||
                init.commandId.length > 255 ||
                !ledgerStringPattern.test(init.commandId))
        ) {
            throw new ValidationError(
                "submit request command ID must be a LedgerString",
            );
        }

        const deduplicationPeriod = freezeDeduplicationPeriod(
            init.deduplicationPeriod,
        );

        this.applicationId = init.applicationId;
        this.userId = init.userId;
        this.actAs = init.actAs;
        this.readAs = init.readAs ?? [];
        this.command = init.command;
        this.commandId = init.commandId;
        this.deduplicationPeriod = deduplicationPeriod;
        this.disclosedContracts = init.disclosedContracts ?? [];
        this.synchronizerId = init.synchronizerId;
    }
}

function freezeDeduplicationPeriod(
    value: CommandDeduplicationPeriod | undefined,
): CommandDeduplicationPeriod | undefined {
    if (value === undefined) {
        return undefined;
    }

    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        throw new ValidationError("submit request deduplication period is invalid");
    }

    if (value.kind === "duration") {
        if (
            typeof value.seconds !== "number" ||
            !Number.isSafeInteger(value.seconds) ||
            value.seconds <= 0
        ) {
            throw new ValidationError(
                "submit request duration deduplication seconds must be a positive safe integer",
            );
        }

        return Object.freeze({ kind: "duration", seconds: value.seconds });
    }

    if (value.kind === "offset") {
        if (
            typeof value.offset !== "string" ||
            !canonicalOffsetPattern.test(value.offset) ||
            (value.offset.length === maximumInt64Offset.length &&
                value.offset > maximumInt64Offset)
        ) {
            throw new ValidationError(
                "submit request offset deduplication period must be a canonical unsigned int64",
            );
        }

        return Object.freeze({ kind: "offset", offset: value.offset });
    }

    throw new ValidationError("submit request deduplication period is invalid");
}
