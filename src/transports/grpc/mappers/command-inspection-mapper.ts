import { CommandInspectionContract } from "../../../core/types/command-inspection-contract.js";
import { CommandRequestStatistics } from "../../../core/types/command-request-statistics.js";
import { CommandState } from "../../../core/types/command-state.js";
import { CommandStatus } from "../../../core/types/command-status.js";
import { CommandTiming } from "../../../core/types/command-timing.js";
import { CommandUpdateSummary } from "../../../core/types/command-update-summary.js";
import { SdkCommand } from "../../../core/types/sdk-command.js";
import { GetCommandStatusRequest } from "../../../core/types/requests/get-command-status-request.js";
import { GetCommandStatusResponse } from "../../../core/types/responses/get-command-status-response.js";
import {
    CommandState as GrpcCommandState,
} from "../generated/canton/com/daml/ledger/api/v2/admin/command_inspection_service.js";
import { GetCommandStatusResponse as GrpcGetCommandStatusResponse } from "../generated/canton/com/daml/ledger/api/v2/admin/command_inspection_service.js";
import { Command as GrpcCommand } from "../generated/canton/com/daml/ledger/api/v2/commands.js";
import { Value } from "../generated/canton/com/daml/ledger/api/v2/value.js";
import { Timestamp } from "../generated/canton/google/protobuf/timestamp.js";
import { mapGrpcCompletion } from "./command-completion-mapper.js";

export function mapGrpcGetCommandStatusRequest(
    request: GetCommandStatusRequest,
): {
    commandIdPrefix: string;
    state: GrpcCommandState;
    limit: number;
} {
    return {
        commandIdPrefix: request.commandIdPrefix ?? "",
        state: mapSdkCommandState(request.state),
        limit: request.limit ?? 0,
    };
}

export function mapGrpcGetCommandStatus(
    payload: Partial<GrpcGetCommandStatusResponse>,
): GetCommandStatusResponse {
    return new GetCommandStatusResponse({
        commandStatuses: (payload.commandStatus ?? []).map(
            mapGrpcCommandStatus,
        ),
    });
}

function mapGrpcCommandStatus(payload: {
    started?: Timestamp;
    completed?: Timestamp;
    completion?: Parameters<typeof mapGrpcCompletion>[0];
    state: GrpcCommandState;
    commands: GrpcCommand[];
    requestStatistics?: {
        envelopes: number;
        requestSize: number;
        recipients: number;
    };
    updates?: {
        created: Array<{
            templateId?: {
                packageId: string;
                moduleName: string;
                entityName: string;
            };
            contractId: string;
            contractKey?: Value;
        }>;
        archived: Array<{
            templateId?: {
                packageId: string;
                moduleName: string;
                entityName: string;
            };
            contractId: string;
            contractKey?: Value;
        }>;
        exercised: number;
        fetched: number;
        lookedUpByKey: number;
    };
    synchronizerId: string;
    timings: Array<{
        description: string;
        durationMs: number;
    }>;
}): CommandStatus {
    return new CommandStatus({
        started: mapGrpcTimestamp(payload.started),
        completed: mapGrpcTimestamp(payload.completed),
        completion:
            payload.completion === undefined
                ? undefined
                : mapGrpcCompletion(payload.completion),
        state: mapGrpcCommandState(payload.state),
        commands: payload.commands.map(mapGrpcCommand),
        requestStatistics:
            payload.requestStatistics === undefined
                ? undefined
                : new CommandRequestStatistics(payload.requestStatistics),
        updates:
            payload.updates === undefined
                ? undefined
                : new CommandUpdateSummary({
                    created: payload.updates.created.map(
                        mapGrpcCommandInspectionContract,
                    ),
                    archived: payload.updates.archived.map(
                        mapGrpcCommandInspectionContract,
                    ),
                    exercised: payload.updates.exercised,
                    fetched: payload.updates.fetched,
                    lookedUpByKey: payload.updates.lookedUpByKey,
                }),
        synchronizerId: payload.synchronizerId || undefined,
        timings: payload.timings.map((item) => new CommandTiming(item)),
    });
}

function mapGrpcCommand(payload: GrpcCommand): SdkCommand {
    switch (payload.command.oneofKind) {
        case "create":
            return new SdkCommand({
                type: "create",
                templateId: mapGrpcIdentifier(payload.command.create.templateId),
                createArguments: mapGrpcRecord(payload.command.create.createArguments),
            });
        case "exercise":
            return new SdkCommand({
                type: "exercise",
                templateId: mapGrpcIdentifier(payload.command.exercise.templateId),
                contractId: payload.command.exercise.contractId,
                choice: payload.command.exercise.choice,
                choiceArgument: mapGrpcValue(
                    payload.command.exercise.choiceArgument,
                ),
            });
        case "exerciseByKey":
            return new SdkCommand({
                type: "exerciseByKey",
                templateId: mapGrpcIdentifier(
                    payload.command.exerciseByKey.templateId,
                ),
                contractKey: mapGrpcValue(
                    payload.command.exerciseByKey.contractKey,
                ),
                choice: payload.command.exerciseByKey.choice,
                choiceArgument: mapGrpcValue(
                    payload.command.exerciseByKey.choiceArgument,
                ),
            });
        case "createAndExercise":
            return new SdkCommand({
                type: "createAndExercise",
                templateId: mapGrpcIdentifier(
                    payload.command.createAndExercise.templateId,
                ),
                createArguments: mapGrpcRecord(
                    payload.command.createAndExercise.createArguments,
                ),
                choice: payload.command.createAndExercise.choice,
                choiceArgument: mapGrpcValue(
                    payload.command.createAndExercise.choiceArgument,
                ),
            });
        default:
            return new SdkCommand({
                type: "unspecified",
            });
    }
}

function mapGrpcCommandInspectionContract(payload: {
    templateId?: {
        packageId: string;
        moduleName: string;
        entityName: string;
    };
    contractId: string;
    contractKey?: Value;
}): CommandInspectionContract {
    return new CommandInspectionContract({
        templateId: mapGrpcIdentifier(payload.templateId),
        contractId: payload.contractId,
        contractKey: mapGrpcValue(payload.contractKey),
    });
}

function mapSdkCommandState(value?: CommandState): GrpcCommandState {
    switch (value) {
        case CommandState.pending:
            return GrpcCommandState.PENDING;
        case CommandState.succeeded:
            return GrpcCommandState.SUCCEEDED;
        case CommandState.failed:
            return GrpcCommandState.FAILED;
        default:
            return GrpcCommandState.UNSPECIFIED;
    }
}

function mapGrpcCommandState(value: GrpcCommandState): CommandState {
    switch (value) {
        case GrpcCommandState.PENDING:
            return CommandState.pending;
        case GrpcCommandState.SUCCEEDED:
            return CommandState.succeeded;
        case GrpcCommandState.FAILED:
            return CommandState.failed;
        default:
            return CommandState.unspecified;
    }
}

function mapGrpcIdentifier(value?: {
    packageId: string;
    moduleName: string;
    entityName: string;
}): string | undefined {
    if (value === undefined) {
        return undefined;
    }

    else if (value.packageId) {
        return `${value.packageId}:${value.moduleName}:${value.entityName}`;
    }

    else {
        return `${value.moduleName}:${value.entityName}`;
    }
}

function mapGrpcRecord(value?: {
    fields: Array<{
        label: string;
        value?: Value;
    }>;
}): Record<string, unknown> | undefined {
    if (value === undefined) {
        return undefined;
    }

    return Object.fromEntries(
        value.fields.map((field, index) => [
            field.label || index.toString(),
            mapGrpcValue(field.value),
        ]),
    );
}

function mapGrpcValue(value?: Value): unknown {
    switch (value?.sum.oneofKind) {
        case "unit":
            return null;
        case "bool":
            return value.sum.bool;
        case "int64":
            return value.sum.int64;
        case "date":
            return value.sum.date;
        case "timestamp":
            return value.sum.timestamp;
        case "numeric":
            return value.sum.numeric;
        case "party":
            return value.sum.party;
        case "text":
            return value.sum.text;
        case "contractId":
            return value.sum.contractId;
        case "optional":
            return mapGrpcValue(value.sum.optional.value);
        case "list":
            return value.sum.list.elements.map(mapGrpcValue);
        case "textMap":
            return Object.fromEntries(
                value.sum.textMap.entries.map((entry) => [
                    entry.key,
                    mapGrpcValue(entry.value),
                ]),
            );
        case "genMap":
            return value.sum.genMap.entries.map((entry) => ({
                key: mapGrpcValue(entry.key),
                value: mapGrpcValue(entry.value),
            }));
        case "record":
            return mapGrpcRecord(value.sum.record);
        case "variant":
            return {
                constructor: value.sum.variant.constructor,
                value: mapGrpcValue(value.sum.variant.value),
            };
        case "enum":
            return value.sum.enum.constructor;
        default:
            return undefined;
    }
}

function mapGrpcTimestamp(timestamp?: Timestamp): Date | undefined {
    if (timestamp === undefined) {
        return undefined;
    }

    const milliseconds =
        Number(timestamp.seconds) * 1_000
        + Math.trunc(timestamp.nanos / 1_000_000);

    return new Date(milliseconds);
}
