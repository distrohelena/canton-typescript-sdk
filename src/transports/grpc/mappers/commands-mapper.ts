import { randomUUID } from "node:crypto";
import { ValidationError } from "../../../core/errors/validation-error.js";
import { CreateAndExerciseCommand } from "../../../core/types/commands/create-and-exercise-command.js";
import { CreateCommand } from "../../../core/types/commands/create-command.js";
import { DamlNumeric } from "../../../core/types/daml-numeric.js";
import { DamlParty } from "../../../core/types/daml-party.js";
import { DamlContractId } from "../../../core/types/daml-contract-id.js";
import { DamlDate, DamlEnum, DamlGenMap, DamlRecord, DamlTextMap, DamlTimestamp, DamlUnit, DamlVariant } from "../../../core/types/daml-values.js";
import { ExerciseByKeyCommand } from "../../../core/types/commands/exercise-by-key-command.js";
import { ExerciseCommand } from "../../../core/types/commands/exercise-command.js";
import { LedgerCommand } from "../../../core/types/commands/ledger-command.js";
import { SubmitCommandsRequest } from "../../../core/types/requests/submit-commands-request.js";
import { SubmitCommandResponse } from "../../../core/types/responses/submit-command-response.js";
import { SubmitCommandTransactionResponse } from "../../../core/types/responses/submit-command-transaction-response.js";
import { Command, Commands } from "../generated/canton/com/daml/ledger/api/v2/commands.js";
import {
    SubmitAndWaitRequest,
    SubmitAndWaitResponse,
    SubmitAndWaitForTransactionRequest,
    SubmitAndWaitForTransactionResponse,
} from "../generated/canton/com/daml/ledger/api/v2/command_service.js";
import {
    Record as GrpcRecord,
    Value,
} from "../generated/canton/com/daml/ledger/api/v2/value.js";
import { mapGrpcDeduplicationPeriod } from "./command-deduplication-mapper.js";

export function mapGrpcSubmitCommandsRequest(
    request: SubmitCommandsRequest,
): SubmitAndWaitRequest {
    return {
        commands: {
            workflowId: "",
            userId: request.userId ?? "",
            commandId: request.commandId ?? randomUUID(),
            commands: request.commands.map(mapGrpcLedgerCommand),
            deduplicationPeriod: mapGrpcDeduplicationPeriod(
                request.deduplicationPeriod,
                { allowParticipantBegin: true },
            ),
            actAs: [...request.actAs],
            readAs: [...request.readAs],
            submissionId: "",
            disclosedContracts: request.disclosedContracts.map(mapGrpcDisclosedContract),
            synchronizerId: request.synchronizerId ?? "",
            packageIdSelectionPreference: [],
            prefetchContractKeys: [],
        } satisfies Commands,
    };
}

export function mapGrpcSubmitCommandsForTransactionRequest(request: SubmitCommandsRequest): SubmitAndWaitForTransactionRequest {
    return { commands: mapGrpcSubmitCommandsRequest(request).commands };
}
export function mapGrpcSubmitCommandTransaction(payload: SubmitAndWaitForTransactionResponse): SubmitCommandTransactionResponse {
    const transaction = payload.transaction;

    return new SubmitCommandTransactionResponse(transaction?.updateId ?? "", transaction?.events ?? [], transaction);
}

function mapGrpcDisclosedContract(value: import("../../../core/types/disclosed-contract.js").DisclosedContract) {
    return { createdEventBlob: value.createdEventBlob, contractId: value.contractId ?? "", synchronizerId: value.synchronizerId ?? "", templateId: value.templateId === undefined ? undefined : { packageId: value.templateId.packageId, moduleName: value.templateId.moduleName, entityName: value.templateId.entityName } };
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
                    templateId: command.templateId,
                    contractId: command.contractId,
                    choice: command.choice,
                    choiceArgument: mapValue(command.choiceArgument),
                },
            },
        };
    } else if (command instanceof ExerciseByKeyCommand) {
        return {
            command: {
                oneofKind: "exerciseByKey",
                exerciseByKey: {
                    templateId: command.templateId,
                    contractKey: mapValue(command.contractKey),
                    choice: command.choice,
                    choiceArgument: mapValue(command.choiceArgument),
                },
            },
        };
    } else if (command instanceof CreateAndExerciseCommand) {
        return {
            command: {
                oneofKind: "createAndExercise",
                createAndExercise: {
                    templateId: command.templateId,
                    createArguments: mapRecord(command.createArguments),
                    choice: command.choice,
                    choiceArgument: mapValue(command.choiceArgument),
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
                templateId: command.templateId,
                createArguments: mapRecord(command.createArguments),
            },
        },
    };
}

export function mapRecord(payload: DamlRecord | Record<string, unknown>): GrpcRecord {
    const fields = payload instanceof DamlRecord ? payload.fields : payload;

    return {
        ...(payload instanceof DamlRecord && payload.recordId !== undefined
            ? { recordId: payload.recordId }
            : {}),
        fields: Object.entries(fields).map(([label, value]) => ({
            label,
            value: mapValue(value),
        })),
    };
}

export function mapValue(value: unknown): Value {
    const identifier = (value: { packageId: string; moduleName: string; entityName: string }) => ({ packageId: value.packageId, moduleName: value.moduleName, entityName: value.entityName });

    if (value instanceof DamlUnit) {
        return { sum: { oneofKind: "unit", unit: {} } };
    } else if (value instanceof DamlDate) {
        return { sum: { oneofKind: "date", date: value.daysSinceEpoch } };
    } else if (value instanceof DamlTimestamp) {
        return { sum: { oneofKind: "timestamp", timestamp: value.microsecondsSinceEpoch } };
    } else if (value instanceof DamlTextMap) {
        return { sum: { oneofKind: "textMap", textMap: { entries: value.entries.map(([key, item]) => ({ key, value: mapValue(item) })) } } };
    } else if (value instanceof DamlGenMap) {
        return { sum: { oneofKind: "genMap", genMap: { entries: value.entries.map(([key, item]) => ({ key: mapValue(key), value: mapValue(item) })) } } };
    } else if (value instanceof DamlVariant) {
        return { sum: { oneofKind: "variant", variant: { variantId: value.variantId && identifier(value.variantId), constructor: value.constructorName, value: mapValue(value.value) } } };
    } else if (value instanceof DamlEnum) {
        return { sum: { oneofKind: "enum", enum: { enumId: value.enumId && identifier(value.enumId), constructor: value.constructorName } } };
    } else if (value instanceof DamlRecord) {
        return { sum: { oneofKind: "record", record: mapRecord(value) } };
    } else if (value === null || value === undefined) {
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

    else if (value instanceof DamlContractId) {
        return { sum: { oneofKind: "contractId", contractId: value.value } };
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
