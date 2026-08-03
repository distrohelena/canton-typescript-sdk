import { ValidationError } from "../../errors/validation-error.js";
import { CommandDeduplicationPeriod } from "../command-deduplication-period.js";
import { LedgerCommand } from "../commands/ledger-command.js";
import { DisclosedContract } from "../disclosed-contract.js";

const ledgerStringPattern = /^[A-Za-z0-9#:\-_/ ]+$/;

const canonicalOffsetPattern = /^(0|[1-9][0-9]*)$/;

const maximumInt64Offset = "9223372036854775807";

export type NonEmptyLedgerCommands = readonly [
    LedgerCommand,
    ...LedgerCommand[],
];

export class SubmitCommandsRequest {
    public readonly applicationId: string;
    public readonly userId?: string;
    public readonly actAs: readonly string[];
    public readonly readAs: readonly string[];
    public readonly commands: NonEmptyLedgerCommands;
    public readonly commandId?: string;
    public readonly deduplicationPeriod?: CommandDeduplicationPeriod;
    public readonly disclosedContracts: readonly DisclosedContract[];
    public readonly synchronizerId?: string;

    public constructor(init: {
        applicationId: string;
        userId?: string;
        actAs: readonly string[];
        readAs?: readonly string[];
        commands: NonEmptyLedgerCommands;
        commandId?: string;
        deduplicationPeriod?: CommandDeduplicationPeriod;
        disclosedContracts?: readonly DisclosedContract[];
        synchronizerId?: string;
    }) {
        const commands = init.commands;

        if (!Array.isArray(commands) || commands.length === 0) {
            throw new ValidationError(
                "submit requests require at least one command",
            );
        } else if (init.actAs.length === 0) {
            throw new ValidationError(
                "submit requests require at least one actAs party",
            );
        } else if (
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
        this.commands = Object.freeze([...commands]) as NonEmptyLedgerCommands;
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
    } else if (
        typeof value !== "object" ||
        value === null ||
        Array.isArray(value)
    ) {
        throw new ValidationError("submit request deduplication period is invalid");
    } else if (value.kind === "duration") {
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
    } else if (value.kind !== "offset") {
        throw new ValidationError("submit request deduplication period is invalid");
    }

    if (
        typeof value.offset !== "string" ||
        !canonicalOffsetPattern.test(value.offset) ||
        value.offset.length > maximumInt64Offset.length ||
        (value.offset.length === maximumInt64Offset.length &&
            value.offset > maximumInt64Offset)
    ) {
        throw new ValidationError(
            "submit request offset deduplication period must be a canonical unsigned int64",
        );
    }

    return Object.freeze({ kind: "offset", offset: value.offset });
}
