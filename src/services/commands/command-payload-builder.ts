import { CreateAndExerciseCommand } from "../../core/types/commands/create-and-exercise-command.js";
import { CreateCommand } from "../../core/types/commands/create-command.js";
import { ExerciseByKeyCommand } from "../../core/types/commands/exercise-by-key-command.js";
import { ExerciseCommand } from "../../core/types/commands/exercise-command.js";
import { LedgerCommand } from "../../core/types/commands/ledger-command.js";
import { SubmitCommandRequest } from "../../core/types/requests/submit-command-request.js";

export function buildCanonicalCommandPayload(
    request: SubmitCommandRequest,
): Uint8Array {
    return new TextEncoder().encode(
        JSON.stringify({
            applicationId: request.applicationId,
            actAs: request.actAs,
            readAs: request.readAs,
            command: mapCanonicalCommand(request.command),
        }),
    );
}

function mapCanonicalCommand(command: LedgerCommand): unknown {
    if (command instanceof CreateCommand) {
        return {
            kind: "create",
            templateId: command.templateId,
            payload: command.payload,
        };
    } else if (command instanceof ExerciseCommand) {
        return {
            kind: "exercise",
            templateId: command.templateId,
            contractId: command.contractId,
            choice: command.choice,
            argument: command.argument,
        };
    } else if (command instanceof ExerciseByKeyCommand) {
        return {
            kind: "exerciseByKey",
            templateId: command.templateId,
            contractKey: command.contractKey,
            choice: command.choice,
            argument: command.argument,
        };
    } else if (command instanceof CreateAndExerciseCommand) {
        return {
            kind: "createAndExercise",
            templateId: command.templateId,
            payload: command.payload,
            choice: command.choice,
            argument: command.argument,
        };
    }

    return {};
}
