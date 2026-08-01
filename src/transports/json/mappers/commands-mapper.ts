import { randomUUID } from "node:crypto";
import { TransportError } from "../../../core/errors/transport-error.js";
import { ValidationError } from "../../../core/errors/validation-error.js";
import { CreateAndExerciseCommand } from "../../../core/types/commands/create-and-exercise-command.js";
import { CreateCommand } from "../../../core/types/commands/create-command.js";
import { DamlNumeric } from "../../../core/types/daml-numeric.js";
import { DamlParty } from "../../../core/types/daml-party.js";
import { DamlRecord } from "../../../core/types/daml-values.js";
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
    if (request.deduplicationPeriod !== undefined) {
        throw new TransportError(
            "command deduplication periods are not supported by the JSON transport",
        );
    }

    return {
        commandId: request.commandId ?? randomUUID(),
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
                templateId: formatTemplateId(command.templateId),
                createArguments: mapJsonValue(command.createArguments.fields),
            },
        };
    } else if (command instanceof ExerciseCommand) {
        return {
            ExerciseCommand: {
                templateId: formatTemplateId(command.templateId),
                contractId: command.contractId,
                choice: command.choice,
                choiceArgument: mapJsonValue(command.choiceArgument),
            },
        };
    } else if (command instanceof ExerciseByKeyCommand) {
        return {
            ExerciseByKeyCommand: {
                templateId: formatTemplateId(command.templateId),
                contractKey: mapJsonValue(command.contractKey),
                choice: command.choice,
                choiceArgument: mapJsonValue(command.choiceArgument),
            },
        };
    } else if (command instanceof CreateAndExerciseCommand) {
        return {
            CreateAndExerciseCommand: {
                templateId: formatTemplateId(command.templateId),
                createArguments: mapJsonValue(command.createArguments.fields),
                choice: command.choice,
                choiceArgument: mapJsonValue(command.choiceArgument),
            },
        };
    }

    throw new ValidationError("unsupported submit command type");
}

function mapJsonValue(value: unknown): unknown {
    if (value instanceof DamlParty || value instanceof DamlNumeric) {
        return value.value;
    } else if (value instanceof DamlRecord) {
        return mapJsonValue(value.fields);
    } else if (Array.isArray(value)) {
        return value.map(mapJsonValue);
    } else if (value !== null && typeof value === "object") {
        return Object.fromEntries(
            Object.entries(value).map(([key, item]) => [key, mapJsonValue(item)]),
        );
    }

    return value;
}

function formatTemplateId(templateId: {
    packageId: string;
    moduleName: string;
    entityName: string;
}): string {
    return templateId.packageId.length === 0
        ? `${templateId.moduleName}:${templateId.entityName}`
        : `${templateId.packageId}:${templateId.moduleName}:${templateId.entityName}`;
}
