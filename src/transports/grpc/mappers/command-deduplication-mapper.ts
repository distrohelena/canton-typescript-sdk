import { ValidationError } from "../../../core/errors/validation-error.js";
import { CommandDeduplicationPeriod } from "../../../core/types/command-deduplication-period.js";
import { Commands } from "../generated/canton/com/daml/ledger/api/v2/commands.js";

export function mapGrpcDeduplicationPeriod(
    period: CommandDeduplicationPeriod | undefined,
    options: { readonly allowParticipantBegin: boolean },
): Commands["deduplicationPeriod"] {
    if (period === undefined) {
        return { oneofKind: undefined };
    }

    if (period.kind === "duration") {
        return {
            oneofKind: "deduplicationDuration",
            deduplicationDuration: { seconds: String(period.seconds), nanos: 0 },
        };
    }

    if (!options.allowParticipantBegin && period.offset === "0") {
        throw new ValidationError(
            "interactive command deduplication offsets must be positive",
        );
    }

    return {
        oneofKind: "deduplicationOffset",
        deduplicationOffset: period.offset,
    };
}
