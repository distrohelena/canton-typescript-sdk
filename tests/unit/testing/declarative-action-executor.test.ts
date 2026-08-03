import { describe, expect, test, vi } from "vitest";

import { CreateCommand } from "../../../src/core/types/commands/create-command.js";
import { ExerciseCommand } from "../../../src/core/types/commands/exercise-command.js";
import { SubmitCommandsRequest } from "../../../src/core/types/requests/submit-commands-request.js";
import {
    executeDeclarativeActionAsync,
} from "../../../src/testing/runtime/declarative-action-executor.js";
import { CantonTestRuntime } from "../../../src/testing/runtime/canton-test-runtime.js";

describe("declarative action executor", () => {
    test("routes typed create actions through the actor's Canton command service", async () => {
        const submitAndWaitAsync = vi.fn().mockResolvedValue({
            kind: "accepted",
            transactionId: "tx-create",
        });

        const runtime = createRuntime(submitAndWaitAsync);

        await expect(executeDeclarativeActionAsync({
            runtime,
            applicationId: "sdk-testing",
            action: {
                actor: "issuer",
                targetKey: "pkg:Main:Iou:create",
                templateId: { packageId: "pkg", moduleName: "Main", entityName: "Iou" },
                payload: { amount: 42n },
            },
        })).resolves.toEqual({ kind: "accepted", updateId: "tx-create" });

        expect(submitAndWaitAsync).toHaveBeenCalledWith(
            "issuer",
            expect.any(SubmitCommandsRequest),
        );

        const request = submitAndWaitAsync.mock.calls[0][1] as SubmitCommandsRequest;

        expect(request).toMatchObject({
            applicationId: "sdk-testing",
            actAs: ["Issuer"],
            readAs: ["Observer"],
        });
        expect(request.commands[0]).toBeInstanceOf(CreateCommand);
        expect(request.commands[0]).toMatchObject({
            templateId: { packageId: "pkg", moduleName: "Main", entityName: "Iou" },
            createArguments: { fields: { amount: 42n } },
        });
    });

    test("requires an explicit active contract resolver for choice actions", async () => {
        const submitAndWaitAsync = vi.fn().mockResolvedValue({
            kind: "accepted",
            commandId: "cmd-choice",
        });

        const runtime = createRuntime(submitAndWaitAsync);

        const resolveContractIdAsync = vi.fn().mockResolvedValue("#contract-1");

        await expect(executeDeclarativeActionAsync({
            runtime,
            applicationId: "sdk-testing",
            action: {
                actor: "issuer",
                targetKey: "pkg:Main:Iou:ChangeAmount",
                templateId: { packageId: "pkg", moduleName: "Main", entityName: "Iou" },
                choice: "ChangeAmount",
                argument: 7n,
            },
            resolveContractIdAsync,
        })).resolves.toEqual({ kind: "accepted", updateId: "cmd-choice" });

        expect(resolveContractIdAsync).toHaveBeenCalledWith(expect.objectContaining({
            choice: "ChangeAmount",
        }));

        const request = submitAndWaitAsync.mock.calls[0][1] as SubmitCommandsRequest;

        expect(request.commands[0]).toBeInstanceOf(ExerciseCommand);
        expect(request.commands[0]).toMatchObject({
            templateId: { packageId: "pkg", moduleName: "Main", entityName: "Iou" },
            contractId: "#contract-1",
            choice: "ChangeAmount",
            choiceArgument: 7n,
        });
    });

    test("rejects a choice action without an active contract resolver", async () => {
        await expect(executeDeclarativeActionAsync({
            runtime: createRuntime(vi.fn()),
            applicationId: "sdk-testing",
            action: {
                actor: "issuer",
                targetKey: "pkg:Main:Iou:Archive",
                templateId: { packageId: "pkg", moduleName: "Main", entityName: "Iou" },
                choice: "Archive",
                argument: "",
            },
        })).rejects.toThrow("requires resolveContractIdAsync");
    });
});

function createRuntime(
    submitAndWaitAsync: CantonTestRuntime["submitAndWaitAsync"],
): CantonTestRuntime {
    return {
        actors: {
            issuer: { party: "Issuer", participant: "participant-a" },
        },
        isolation: { kind: "external" },
        participants: { "participant-a": {} },
        readLedgerEndAsync: async () => "0",
        resolveRoute: (actor) => ({
            actor,
            party: "Issuer",
            participant: "participant-a",
            actAs: ["Issuer"],
            readAs: ["Observer"],
        }),
        submitAndWaitAsync,
    };
}
