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
    extractSoleCreatedContract,
    loadExampleApplicationFixtureAsync,
    readCreatedMessageText,
    resolveExamplePartyAsync,
} from "./shared/application-fixture.js";
import {
    assertAtomicMessageTerminalState,
    buildActiveContractsRequest,
    collectActiveMessagesAcrossPagesAsync,
} from "./shared/ledger-requests.js";
import { createExampleClient, exampleTimeoutMs } from "./shared/localnet.js";
import { runExampleAsync } from "./shared/run.js";
import { readWorkflowCompatibilityAsync } from "./shared/workflow-compatibility.js";
import { createWorkflowDeadline } from "./shared/workflow-deadline.js";
import {
    classifyWorkflowFailure,
    type WorkflowFailureKind,
} from "./shared/workflow-errors.js";
import { runClientWorkflowWithDisposalAsync } from "./shared/update-stream-lifecycle.js";

runExampleAsync("atomic-create-and-exercise", async () => {
    const client = createExampleClient();

    await runClientWorkflowWithDisposalAsync({
        disposeAsync: () => client.disposeAsync(),
        runWorkflowAsync: async () => {
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

        const submittedReplacement = extractSoleCreatedContract(validResponse);

        const request = buildActiveContractsRequest({
            party: actor.party,
            templateId: fixture.templateId,
        });

        const runMessages = await collectActiveMessagesAcrossPagesAsync({
            request,
            predicate: message => {
                const text = readCreatedMessageText(message);

                return text === initialText || text === replacementText;
            },
            timeoutMs: deadline.remainingMs(),
            readPageAsync: pageRequest =>
                client.stateService.getActiveContractsPageAsync(
                    pageRequest,
                    new RequestOptions({ timeoutMs: deadline.remainingMs() }),
                ),
        });

        const activeReplacement = assertAtomicMessageTerminalState({
            messages: runMessages,
            initialText,
            replacementText,
            responseContractId: submittedReplacement.contractId,
            party: actor.party,
        });

        const actualReplacementText = readCreatedMessageText(activeReplacement);

        const replacementPayload = JSON.stringify(activeReplacement.createArguments);

        if (replacementPayload === undefined) {
            throw new Error(
                `Replacement Message '${submittedReplacement.contractId}' has a create payload that cannot be rendered.`,
            );
        }

        console.log(`Actor party: ${actor.party}`);
        console.log(`Participant version: ${compatibility.participantVersion}`);
        console.log(`Release core: ${compatibility.releaseCore}`);
        console.log(`Compatibility path: ${compatibility.path}`);
        console.log(`Invalid choice kind: ${invalidChoiceKind}`);
        console.log(
            "Atomic terminal proof: initial Message absent; exactly one replacement Message is active.",
        );
        console.log(`Replacement contract: ${activeReplacement.contractId}`);
        console.log(`Replacement payload: ${replacementPayload}`);
        console.log(`Replacement text: ${actualReplacementText}`);
        },
    });
});
