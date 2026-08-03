import { randomBytes } from "node:crypto";
import {
    CreateAndExerciseCommand,
    CreateCommand,
    DamlParty,
    DamlRecord,
    OperationDeadline,
    SubmitCommandsRequest,
} from "@distrohelena/canton-typescript-sdk";
import { ledgerApiV2 } from "@distrohelena/canton-typescript-sdk/protobuf";
import {
    ensureExampleDarUploadedAsync,
    loadExampleApplicationFixtureAsync,
    readCreatedMessageText,
    resolveExamplePartyAsync,
} from "./shared/application-fixture.js";
import {
    assertAtomicMessageBatchState,
    buildActiveContractsRequest,
    extractTwoCreatedContractIds,
} from "./shared/ledger-requests.js";
import { createExampleActiveContractsTraversalOptions } from "./shared/active-contracts-traversal.js";
import { createExampleClient, exampleTimeoutMs } from "./shared/localnet.js";
import { runExampleAsync } from "./shared/run.js";
import { readWorkflowCompatibilityAsync } from "./shared/workflow-compatibility.js";
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
            const deadline = new OperationDeadline({
                timeoutMs: exampleTimeoutMs(),
            });

            const fixture = await loadExampleApplicationFixtureAsync();

            await ensureExampleDarUploadedAsync(client, fixture, deadline);

            const actor = await resolveExamplePartyAsync(client, process.env, deadline);

            const compatibility = await readWorkflowCompatibilityAsync(client, deadline);

            if (actor.allocated) {
                console.warn(
                    "Warning: fallback party allocation creates durable localnet topology state and is not cleaned up.",
                );
            }

            console.warn(
                "Warning: created contracts and localnet ledger state are durable and are not cleaned up.",
            );

            const runId = randomBytes(12).toString("hex");

            const invalidFirstText = `atomic-invalid-first-${runId}`;

            const firstText = `atomic-valid-first-${runId}`;

            const secondText = `atomic-valid-second-${runId}`;

            const invalidCommandId = `atomic-invalid-${runId}`;

            const validCommandId = `atomic-valid-${runId}`;

            const invalidRequest = new SubmitCommandsRequest({
                applicationId: "canton-typescript-sdk-examples",
                actAs: [actor.party],
                readAs: [actor.party],
                commands: [
                    new CreateCommand({
                        templateId: fixture.templateId,
                        createArguments: new DamlRecord({
                            sender: new DamlParty(actor.party),
                            recipient: new DamlParty(actor.party),
                            text: invalidFirstText,
                        }),
                    }),
                    new CreateAndExerciseCommand({
                        templateId: fixture.templateId,
                        createArguments: new DamlRecord({
                            sender: new DamlParty(actor.party),
                            recipient: new DamlParty(actor.party),
                            text: invalidFirstText,
                        }),
                        choice: "UnknownChoice",
                        choiceArgument: new DamlRecord({}),
                    }),
                ],
                commandId: invalidCommandId,
            });

            let invalidChoiceKind: WorkflowFailureKind;

            try {
                await client.commandService.submitAndWaitForTransactionAsync(
                    invalidRequest,
                    deadline.createRequestOptions(),
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

            const validRequest = new SubmitCommandsRequest({
                applicationId: "canton-typescript-sdk-examples",
                actAs: [actor.party],
                readAs: [actor.party],
                commands: [
                    new CreateCommand({
                        templateId: fixture.templateId,
                        createArguments: new DamlRecord({
                            sender: new DamlParty(actor.party),
                            recipient: new DamlParty(actor.party),
                            text: firstText,
                        }),
                    }),
                    new CreateCommand({
                        templateId: fixture.templateId,
                        createArguments: new DamlRecord({
                            sender: new DamlParty(actor.party),
                            recipient: new DamlParty(actor.party),
                            text: secondText,
                        }),
                    }),
                ],
                commandId: validCommandId,
            });

            const validResponse = await client.commandService.submitAndWaitForTransactionAsync(
                validRequest,
                deadline.createRequestOptions(),
            );

            const responseContractIds = extractTwoCreatedContractIds(validResponse);

            const request = buildActiveContractsRequest({
                party: actor.party,
                templateId: fixture.templateId,
            });

            const runMessages = [];

            for await (const page of client.stateService.getActiveContractsPagesAsync(
                request,
                createExampleActiveContractsTraversalOptions(deadline),
            )) {
                for (const response of page.activeContracts) {
                    if (response.contractEntry.oneofKind !== "activeContract") {
                        continue;
                    }

                    const message = response.contractEntry.activeContract.createdEvent;

                    if (!ledgerApiV2.CreatedEvent.is(message)) {
                        continue;
                    }

                    const text = readCreatedMessageText(message);

                    if (
                        text === invalidFirstText
                        || text === firstText
                        || text === secondText
                    ) {
                        runMessages.push(message);
                    }
                }
            }

            const [activeFirst, activeSecond] = assertAtomicMessageBatchState({
                messages: runMessages,
                invalidFirstText,
                firstText,
                secondText,
                responseContractIds,
                party: actor.party,
                templateId: fixture.templateId,
            });

            console.log(`Actor party: ${actor.party}`);
            console.log(`Participant version: ${compatibility.participantVersion}`);
            console.log(`Release core: ${compatibility.releaseCore}`);
            console.log(`Compatibility path: ${compatibility.path}`);
            console.log(`Invalid choice kind: ${invalidChoiceKind}`);
            console.log(
                "Atomic batch proof: rejected first Message absent; both valid Messages are active exactly once.",
            );
            console.log(`First valid Message contract: ${activeFirst.contractId}`);
            console.log(`Second valid Message contract: ${activeSecond.contractId}`);
        },
    });
});
