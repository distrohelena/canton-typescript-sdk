import { describe, expect, test, vi } from "vitest";

import { CreateCommand } from "../../../src/core/types/commands/create-command.js";
import { ExerciseCommand } from "../../../src/core/types/commands/exercise-command.js";
import { SubmitCommandRequest } from "../../../src/core/types/requests/submit-command-request.js";
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
                templateId: "pkg:Main:Iou",
                payload: { amount: 42n },
            },
        })).resolves.toEqual({ kind: "accepted", updateId: "tx-create" });

        expect(submitAndWaitAsync).toHaveBeenCalledWith(
            "issuer",
            expect.any(SubmitCommandRequest),
        );

        const request = submitAndWaitAsync.mock.calls[0][1] as SubmitCommandRequest;

        expect(request).toMatchObject({
            applicationId: "sdk-testing",
            actAs: ["Issuer"],
            readAs: ["Observer"],
        });
        expect(request.command).toBeInstanceOf(CreateCommand);
        expect(request.command).toMatchObject({
            templateId: "pkg:Main:Iou",
            payload: { amount: 42n },
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
                templateId: "pkg:Main:Iou",
                choice: "ChangeAmount",
                argument: 7n,
            },
            resolveContractIdAsync,
        })).resolves.toEqual({ kind: "accepted", updateId: "cmd-choice" });

        expect(resolveContractIdAsync).toHaveBeenCalledWith(expect.objectContaining({
            choice: "ChangeAmount",
        }));

        const request = submitAndWaitAsync.mock.calls[0][1] as SubmitCommandRequest;

        expect(request.command).toBeInstanceOf(ExerciseCommand);
        expect(request.command).toMatchObject({
            templateId: "pkg:Main:Iou",
            contractId: "#contract-1",
            choice: "ChangeAmount",
            argument: 7n,
        });
    });

    test("rejects a choice action without an active contract resolver", async () => {
        await expect(executeDeclarativeActionAsync({
            runtime: createRuntime(vi.fn()),
            applicationId: "sdk-testing",
            action: {
                actor: "issuer",
                targetKey: "pkg:Main:Iou:Archive",
                templateId: "pkg:Main:Iou",
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
