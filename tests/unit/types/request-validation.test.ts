import { describe, expect, it } from "vitest";
import {
    CommandDeduplicationPeriod,
    CreateCommand,
    DamlRecord,
    ExerciseCommand,
    LedgerCommand,
    NonEmptyLedgerCommands,
    SubmitCommandsRequest,
    ValidationError,
} from "../../../src";

describe("request validation", () => {
    const command = new CreateCommand({
        templateId: { packageId: "", moduleName: "Main", entityName: "Iou" },
        createArguments: new DamlRecord({}),
    });

    it("rejects a submit request without an acting party", () => {
        expect(
            () =>
                new SubmitCommandsRequest({
                    applicationId: "app-1",
                    actAs: [],
                    commands: [new CreateCommand({
                        templateId: { packageId: "", moduleName: "Main", entityName: "Iou" },
                        createArguments: new DamlRecord({}),
                    })],
                }),
        ).toThrow(ValidationError);
    });

    it("accepts exercise commands when an acting party is present", () => {
        expect(
            () =>
                new SubmitCommandsRequest({
                    applicationId: "app-1",
                    userId: "wallet-user",
                    actAs: ["Alice"],
                    commands: [new ExerciseCommand({
                        templateId: { packageId: "", moduleName: "Main", entityName: "Iou" },
                        contractId: "00abc",
                        choice: "Archive",
                        choiceArgument: {},
                    })],
                }),
        ).not.toThrow();
    });

    it("stores a submit request userId when provided", () => {
        const request = new SubmitCommandsRequest({
            applicationId: "app-1",
            userId: "wallet-user",
            actAs: ["Alice"],
            commands: [new CreateCommand({
                templateId: { packageId: "", moduleName: "Main", entityName: "Iou" },
                createArguments: new DamlRecord({}),
            })],
        });

        expect(request.userId).toBe("wallet-user");
    });

    it("stores caller-controlled command identity and a frozen duration deduplication period", () => {
        const deduplicationPeriod = { kind: "duration" as const, seconds: 30 };

        const request = new SubmitCommandsRequest({
            applicationId: "workflow-examples",
            actAs: ["Alice"],
            commands: [command],
            commandId: "retry-command-1",
            deduplicationPeriod,
        });

        expect(request.commandId).toBe("retry-command-1");
        expect(request.deduplicationPeriod).toEqual({ kind: "duration", seconds: 30 });
        expect(request.deduplicationPeriod).not.toBe(deduplicationPeriod);
        expect(Object.isFrozen(request.deduplicationPeriod)).toBe(true);
    });

    it.each([
        ["", "empty"],
        ["a".repeat(256), "too long"],
        ["retry.command", "illegal characters"],
    ])("rejects %s command IDs", (commandId) => {
        expect(
            () =>
                new SubmitCommandsRequest({
                    applicationId: "workflow-examples",
                    actAs: ["Alice"],
                    commands: [command],
                    commandId,
                }),
        ).toThrow(ValidationError);
    });

    it.each([0, -1, 1.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1])(
        "rejects invalid duration deduplication seconds: %s",
        (seconds) => {
            expect(
                () =>
                    new SubmitCommandsRequest({
                        applicationId: "workflow-examples",
                        actAs: ["Alice"],
                        commands: [command],
                        deduplicationPeriod: { kind: "duration", seconds },
                    }),
            ).toThrow(ValidationError);
        },
    );

    it.each([
        "",
        "00",
        "+1",
        "-1",
        "abc",
        "9223372036854775808",
        "92233720368547758070",
        "1".repeat(100),
    ])(
        "rejects invalid offset deduplication period: %s",
        (offset) => {
            expect(
                () =>
                    new SubmitCommandsRequest({
                        applicationId: "workflow-examples",
                        actAs: ["Alice"],
                        commands: [command],
                        deduplicationPeriod: { kind: "offset", offset },
                    }),
            ).toThrow(ValidationError);
        },
    );

    it.each(["0", "9223372036854775807"])(
        "accepts canonical int64 offset deduplication period: %s",
        (offset) => {
            const request = new SubmitCommandsRequest({
                applicationId: "workflow-examples",
                actAs: ["Alice"],
                commands: [command],
                deduplicationPeriod: { kind: "offset", offset },
            });

            expect(request.deduplicationPeriod).toEqual({ kind: "offset", offset });
            expect(Object.isFrozen(request.deduplicationPeriod)).toBe(true);
        },
    );

    it.each([
        { kind: "unexpected" },
        { kind: "duration" },
        { kind: "duration", seconds: "30" },
        { kind: "offset" },
        { kind: "offset", offset: 30 },
        null,
        [],
        "duration",
        30,
    ])("rejects malformed runtime deduplication periods: %o", (deduplicationPeriod) => {
        expect(
            () =>
                new SubmitCommandsRequest({
                    applicationId: "workflow-examples",
                    actAs: ["Alice"],
                    commands: [command],
                    deduplicationPeriod:
                        deduplicationPeriod as unknown as CommandDeduplicationPeriod,
                }),
        ).toThrow(ValidationError);
    });

    it("stores one-command and two-command batches in caller order as a frozen copy", () => {
        const secondCommand = new ExerciseCommand({
            templateId: { packageId: "", moduleName: "Main", entityName: "Iou" },
            contractId: "00abc",
            choice: "Archive",
            choiceArgument: {},
        });

        const input: [LedgerCommand, ...LedgerCommand[]] = [command, secondCommand];

        const singleCommandRequest = new SubmitCommandsRequest({
            applicationId: "workflow-examples",
            actAs: ["Alice"],
            commands: [command],
        });

        const request = new SubmitCommandsRequest({
            applicationId: "workflow-examples",
            actAs: ["Alice"],
            commands: input as NonEmptyLedgerCommands,
        });

        expect(singleCommandRequest.commands).toEqual([command]);
        expect(request.commands).toEqual([command, secondCommand]);
        expect(request.commands).not.toBe(input);
        expect(Object.isFrozen(request.commands)).toBe(true);

        input.pop();

        expect(request.commands).toEqual([command, secondCommand]);
    });

    it.each([[], null, {}, "command"])(
        "rejects malformed runtime command batches: %o",
        (commands) => {
            expect(
                () =>
                    new SubmitCommandsRequest({
                        applicationId: "workflow-examples",
                        actAs: ["Alice"],
                        commands: commands as NonEmptyLedgerCommands,
                    }),
            ).toThrowError(
                new ValidationError("submit requests require at least one command"),
            );
        },
    );
});
