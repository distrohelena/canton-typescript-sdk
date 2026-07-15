import { randomUUID } from "node:crypto";
import { ValidationError } from "../../../core/errors/validation-error.js";
import { CreateAndExerciseCommand } from "../../../core/types/commands/create-and-exercise-command.js";
import { CreateCommand } from "../../../core/types/commands/create-command.js";
import { DamlNumeric } from "../../../core/types/daml-numeric.js";
import { DamlParty } from "../../../core/types/daml-party.js";
import { ExerciseByKeyCommand } from "../../../core/types/commands/exercise-by-key-command.js";
import { ExerciseCommand } from "../../../core/types/commands/exercise-command.js";
import { LedgerCommand } from "../../../core/types/commands/ledger-command.js";
import { SubmitCommandRequest } from "../../../core/types/requests/submit-command-request.js";
import { SubmitCommandResponse } from "../../../core/types/responses/submit-command-response.js";
import { Command, Commands } from "../generated/canton/com/daml/ledger/api/v2/commands.js";
import {
    SubmitAndWaitRequest,
    SubmitAndWaitResponse,
} from "../generated/canton/com/daml/ledger/api/v2/command_service.js";
import {
    Identifier,
    Record as GrpcRecord,
    Value,
} from "../generated/canton/com/daml/ledger/api/v2/value.js";

export function mapGrpcSubmitCommandRequest(
    request: SubmitCommandRequest,
): SubmitAndWaitRequest {
    return {
        commands: {
            workflowId: "",
            userId: request.userId ?? "",
            commandId: randomUUID(),
            commands: [mapGrpcLedgerCommand(request.command)],
            deduplicationPeriod: {
                oneofKind: undefined,
            },
            actAs: [...request.actAs],
            readAs: [...request.readAs],
            submissionId: "",
            disclosedContracts: [],
            synchronizerId: "",
            packageIdSelectionPreference: [],
            prefetchContractKeys: [],
        } satisfies Commands,
    };
}

export function mapGrpcSubmitCommand(payload: {
    commandId?: string;
    transactionId?: string;
    updateId?: string;
} | SubmitAndWaitResponse): SubmitCommandResponse {
    return new SubmitCommandResponse({
        commandId: "commandId" in payload ? payload.commandId : undefined,
        transactionId:
            "transactionId" in payload
                ? payload.transactionId
                : payload.updateId,
    });
}

export function mapGrpcLedgerCommand(command: LedgerCommand): Command {
    if (command instanceof CreateCommand) {
        return mapGrpcCreateCommand(command);
    } else if (command instanceof ExerciseCommand) {
        return {
            command: {
                oneofKind: "exercise",
                exercise: {
                    templateId: parseTemplateIdentifier(command.templateId),
                    contractId: command.contractId,
                    choice: command.choice,
                    choiceArgument: mapValue(command.argument),
                },
            },
        };
    } else if (command instanceof ExerciseByKeyCommand) {
        return {
            command: {
                oneofKind: "exerciseByKey",
                exerciseByKey: {
                    templateId: parseTemplateIdentifier(command.templateId),
                    contractKey: mapValue(command.contractKey),
                    choice: command.choice,
                    choiceArgument: mapValue(command.argument),
                },
            },
        };
    } else if (command instanceof CreateAndExerciseCommand) {
        return {
            command: {
                oneofKind: "createAndExercise",
                createAndExercise: {
                    templateId: parseTemplateIdentifier(command.templateId),
                    createArguments: mapRecord(command.payload),
                    choice: command.choice,
                    choiceArgument: mapValue(command.argument),
                },
            },
        };
    }

    throw new ValidationError("unsupported submit command type");
}

export function mapGrpcCreateCommand(command: CreateCommand): Command {
    return {
        command: {
            oneofKind: "create",
            create: {
                templateId: parseTemplateIdentifier(
                    command.templateId,
                ),
                createArguments: mapRecord(command.payload),
            },
        },
    };
}

export function mapRecord(payload: Record<string, unknown>): GrpcRecord {
    return {
        fields: Object.entries(payload).map(([label, value]) => ({
            label,
            value: mapValue(value),
        })),
    };
}

export function mapValue(value: unknown): Value {
    if (value === null || value === undefined) {
        return {
            sum: {
                oneofKind: "optional",
                optional: {},
            },
        };
    }

    else if (value instanceof DamlParty) {
        return {
            sum: {
                oneofKind: "party",
                party: value.value,
            },
        };
    }

    else if (value instanceof DamlNumeric) {
        return {
            sum: {
                oneofKind: "numeric",
                numeric: value.value,
            },
        };
    }

    else if (typeof value === "string") {
        return {
            sum: {
                oneofKind: "text",
                text: value,
            },
        };
    }

    else if (typeof value === "boolean") {
        return {
            sum: {
                oneofKind: "bool",
                bool: value,
            },
        };
    }

    else if (typeof value === "number") {
        return Number.isInteger(value)
            ? {
                sum: {
                    oneofKind: "int64",
                    int64: value.toString(),
                },
            }
            : {
                sum: {
                    oneofKind: "numeric",
                    numeric: value.toString(),
                },
            };
    }

    else if (Array.isArray(value)) {
        return {
            sum: {
                oneofKind: "list",
                list: {
                    elements: value.map(mapValue),
                },
            },
        };
    }

    return {
        sum: {
            oneofKind: "record",
            record: mapRecord(value as Record<string, unknown>),
        },
    };
}

export function parseTemplateIdentifier(templateId: string): Identifier {
    const parts = templateId.split(":");

    if (parts.length === 2) {
        return {
            packageId: "",
            moduleName: parts[0],
            entityName: parts[1],
        };
    }

    else if (parts.length === 3) {
        return {
            packageId: parts[0],
            moduleName: parts[1],
            entityName: parts[2],
        };
    }

    throw new ValidationError(
        `templateId must be '<module>:<entity>' or '<package>:<module>:<entity>', but was '${templateId}'.`,
    );
}
