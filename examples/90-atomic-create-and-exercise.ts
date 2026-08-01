import { randomBytes } from "node:crypto";
import {
    CreateAndExerciseCommand,
    DamlParty,
    DamlRecord,
    RequestOptions,
    SubmitCommandRequest,
} from "@distrohelena/canton-typescript-sdk";
import {
    buildCreateAndReplaceMessageTextRequest,
    ensureExampleDarUploadedAsync,
    extractReplacementContracts,
    loadExampleApplicationFixtureAsync,
    readCreatedMessageText,
    resolveExamplePartyAsync,
} from "./shared/application-fixture.js";
import {
    buildActiveContractsRequest,
    findActiveMessageAcrossPagesAsync,
} from "./shared/ledger-requests.js";
import { createExampleClient, exampleTimeoutMs } from "./shared/localnet.js";
import { runExampleAsync } from "./shared/run.js";
import { readWorkflowCompatibilityAsync } from "./shared/workflow-compatibility.js";
import { createWorkflowDeadline } from "./shared/workflow-deadline.js";
import {
    classifyWorkflowFailure,
    type WorkflowFailureKind,
} from "./shared/workflow-errors.js";

runExampleAsync("atomic-create-and-exercise", async () => {
    const client = createExampleClient();

    try {
        const fixture = await loadExampleApplicationFixtureAsync();

        const deadline = createWorkflowDeadline({
            timeoutMs: exampleTimeoutMs(),
        });

        await ensureExampleDarUploadedAsync(client, fixture, {
            remainingTimeoutMs: deadline.remainingMs,
        });

        const actor = await resolveExamplePartyAsync(client, process.env, {
            remainingTimeoutMs: deadline.remainingMs,
        });

        const compatibility = await readWorkflowCompatibilityAsync(client, {
            remainingTimeoutMs: deadline.remainingMs,
        });

        if (actor.allocated) {
            console.warn(
                "Warning: fallback party allocation creates durable localnet topology state and is not cleaned up.",
            );
        }

        console.warn(
            "Warning: created contracts and localnet ledger state are durable and are not cleaned up.",
        );

        const runId = randomBytes(12).toString("hex");

        const initialText = `atomic-initial-${runId}`;

        const replacementText = `atomic-replacement-${runId}`;

        const invalidCommandId = `atomic-invalid-${runId}`;

        const validCommandId = `atomic-valid-${runId}`;

        const invalidRequest = new SubmitCommandRequest({
            applicationId: "canton-typescript-sdk-examples",
            actAs: [actor.party],
            readAs: [actor.party],
            command: new CreateAndExerciseCommand({
                templateId: fixture.templateId,
                createArguments: new DamlRecord({
                    sender: new DamlParty(actor.party),
                    recipient: new DamlParty(actor.party),
                    text: initialText,
                }),
                choice: "UnknownChoice",
                choiceArgument: new DamlRecord({}),
            }),
            commandId: invalidCommandId,
        });

        let invalidChoiceKind: WorkflowFailureKind;

        try {
            await client.commandService.submitAndWaitForTransactionAsync(
                invalidRequest,
                new RequestOptions({ timeoutMs: deadline.remainingMs() }),
            );

            throw new Error("The invalid CreateAndExercise choice unexpectedly succeeded.");
        } catch (error) {
            invalidChoiceKind = classifyWorkflowFailure({
                error,
                kind: "invalidChoice",
                operation: "commandSubmission",
                compatibility,
            });
        }

        const validResponse =
            await client.commandService.submitAndWaitForTransactionAsync(
                buildCreateAndReplaceMessageTextRequest({
                    party: actor.party,
                    templateId: fixture.templateId,
                    text: initialText,
                    replacement: replacementText,
                    commandId: validCommandId,
                }),
                new RequestOptions({ timeoutMs: deadline.remainingMs() }),
            );

        const { archivedContractId, replacementContractId } =
            extractReplacementContracts(validResponse);

        if (
            !archivedContractId.trim()
            || !replacementContractId.trim()
            || archivedContractId === replacementContractId
        ) {
            throw new Error(
                "CreateAndExercise must archive a non-empty transient contract and create a distinct non-empty replacement contract.",
            );
        }

        const request = buildActiveContractsRequest({
            party: actor.party,
            templateId: fixture.templateId,
        });

        const replacement = await findActiveMessageAcrossPagesAsync({
            request,
            contractId: replacementContractId,
            timeoutMs: deadline.remainingMs(),
            readPageAsync: pageRequest =>
                client.stateService.getActiveContractsPageAsync(
                    pageRequest,
                    new RequestOptions({ timeoutMs: deadline.remainingMs() }),
                ),
        });

        if (replacement === undefined) {
            throw new Error(
                `Replacement Message '${replacementContractId}' was not present in the active-contract snapshot.`,
            );
        }

        const actualReplacementText = readCreatedMessageText(replacement);

        if (replacementText !== actualReplacementText) {
            throw new Error(
                `Replacement Message '${replacementContractId}' did not retain the requested replacement text.`,
            );
        }

        const replacementPayload = JSON.stringify(replacement.createArguments);

        if (replacementPayload === undefined) {
            throw new Error(
                `Replacement Message '${replacementContractId}' has a create payload that cannot be rendered.`,
            );
        }

        console.log(`Actor party: ${actor.party}`);
        console.log(`Participant version: ${compatibility.participantVersion}`);
        console.log(`Release core: ${compatibility.releaseCore}`);
        console.log(`Compatibility path: ${compatibility.path}`);
        console.log(`Invalid choice kind: ${invalidChoiceKind}`);
        console.log(`Archived transient contract: ${archivedContractId}`);
        console.log(`Replacement contract: ${replacementContractId}`);
        console.log(`Replacement payload: ${replacementPayload}`);
        console.log(`Replacement text: ${actualReplacementText}`);
    } finally {
        await client.disposeAsync();
    }
});
