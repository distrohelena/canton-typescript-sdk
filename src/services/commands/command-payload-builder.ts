import { CreateAndExerciseCommand } from "../../core/types/commands/create-and-exercise-command.js";
import { CreateCommand } from "../../core/types/commands/create-command.js";
import { ExerciseByKeyCommand } from "../../core/types/commands/exercise-by-key-command.js";
import { ExerciseCommand } from "../../core/types/commands/exercise-command.js";
import { LedgerCommand } from "../../core/types/commands/ledger-command.js";
import { SubmitCommandsRequest } from "../../core/types/requests/submit-commands-request.js";

export function buildCanonicalCommandPayload(
    request: SubmitCommandsRequest,
): Uint8Array {
    return new TextEncoder().encode(
        JSON.stringify({
            applicationId: request.applicationId,
            actAs: request.actAs,
            readAs: request.readAs,
            commands: request.commands.map(mapCanonicalCommand),
        }),
    );
}

function mapCanonicalCommand(command: LedgerCommand): unknown {
    if (command instanceof CreateCommand) {
        return {
            kind: "create",
            templateId: command.templateId,
            createArguments: mapCanonicalRecord(command.createArguments),
        };
    } else if (command instanceof ExerciseCommand) {
        return {
            kind: "exercise",
            templateId: command.templateId,
            contractId: command.contractId,
            choice: command.choice,
            choiceArgument: command.choiceArgument,
        };
    } else if (command instanceof ExerciseByKeyCommand) {
        return {
            kind: "exerciseByKey",
            templateId: command.templateId,
            contractKey: command.contractKey,
            choice: command.choice,
            choiceArgument: command.choiceArgument,
        };
    } else if (command instanceof CreateAndExerciseCommand) {
        return {
            kind: "createAndExercise",
            templateId: command.templateId,
            createArguments: mapCanonicalRecord(command.createArguments),
            choice: command.choice,
            choiceArgument: command.choiceArgument,
        };
    }

    return {};
}

function mapCanonicalRecord(record: import("../../core/types/daml-values.js").DamlRecord) {
    return {
        fields: record.fields,
        recordId: record.recordId ?? null,
    };
}
