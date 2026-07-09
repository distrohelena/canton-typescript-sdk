import { randomUUID } from "node:crypto";
import { ValidationError } from "../../../core/errors/validation-error.js";
import { CreateAndExerciseCommand } from "../../../core/types/commands/create-and-exercise-command.js";
import { CreateCommand } from "../../../core/types/commands/create-command.js";
import { ExerciseByKeyCommand } from "../../../core/types/commands/exercise-by-key-command.js";
import { ExerciseCommand } from "../../../core/types/commands/exercise-command.js";
import { LedgerCommand } from "../../../core/types/commands/ledger-command.js";
import { SubmitCommandRequest } from "../../../core/types/requests/submit-command-request.js";
import { SubmitCommandResponse } from "../../../core/types/responses/submit-command-response.js";

export function mapJsonSubmitCommandRequest(
    request: SubmitCommandRequest,
): {
    commandId: string;
    actAs: readonly string[];
    readAs: readonly string[];
    commands: unknown[];
    applicationId?: string;
} {
    return {
        commandId: randomUUID(),
        actAs: request.actAs,
        readAs: request.readAs,
        commands: [mapJsonCommand(request.command)],
        applicationId: request.applicationId || undefined,
    };
}

export function mapJsonSubmitCommand(payload: {
    result?: {
        commandId?: string;
        transactionId?: string;
        updateId?: string;
    };
    commandId?: string;
    transactionId?: string;
    updateId?: string;
    completionOffset?: string;
}): SubmitCommandResponse {
    return new SubmitCommandResponse({
        commandId: payload.result?.commandId ?? payload.commandId,
        transactionId:
            payload.result?.transactionId
            ?? payload.result?.updateId
            ?? payload.transactionId
            ?? payload.updateId,
    });
}

function mapJsonCommand(command: LedgerCommand): unknown {
    if (command instanceof CreateCommand) {
        return {
            CreateCommand: {
                templateId: command.templateId,
                createArguments: command.payload,
            },
        };
    } else if (command instanceof ExerciseCommand) {
        return {
            ExerciseCommand: {
                templateId: command.templateId,
                contractId: command.contractId,
                choice: command.choice,
                choiceArgument: command.argument,
            },
        };
    } else if (command instanceof ExerciseByKeyCommand) {
        return {
            ExerciseByKeyCommand: {
                templateId: command.templateId,
                contractKey: command.contractKey,
                choice: command.choice,
                choiceArgument: command.argument,
            },
        };
    } else if (command instanceof CreateAndExerciseCommand) {
        return {
            CreateAndExerciseCommand: {
                templateId: command.templateId,
                createArguments: command.payload,
                choice: command.choice,
                choiceArgument: command.argument,
            },
        };
    }

    throw new ValidationError("unsupported submit command type");
}
