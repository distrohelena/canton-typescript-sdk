import { randomBytes } from "node:crypto";
import {
    GetLedgerEndRequest,
    OperationDeadline,
} from "@distrohelena/canton-typescript-sdk";
import { ledgerApiV2 } from "@distrohelena/canton-typescript-sdk/protobuf";
import {
    buildCreateMessageRequest,
    ensureExampleDarUploadedAsync,
    loadExampleApplicationFixtureAsync,
    resolveExamplePartyAsync,
} from "./shared/application-fixture.js";
import { submitAndWaitForCommandCompletionAsync } from "./shared/command-completion-correlation.js";
import { createExampleClient, exampleTimeoutMs } from "./shared/localnet.js";
import { runExampleAsync } from "./shared/run.js";
import { readWorkflowCompatibilityAsync } from "./shared/workflow-compatibility.js";
import { runClientWorkflowWithDisposalAsync } from "./shared/update-stream-lifecycle.js";

runExampleAsync("command-completion-correlation", async () => {
    const userId = process.env.SDK_EXAMPLE_USER_ID;

    if (userId === undefined || !userId.trim()) {
        throw new Error(
            "SDK_EXAMPLE_USER_ID must be set to a non-whitespace ledger user ID for completion correlation.",
        );
    }

    const client = createExampleClient();

    await runClientWorkflowWithDisposalAsync({
        disposeAsync: () => client.disposeAsync(),
        runWorkflowAsync: async () => {
            const deadline = new OperationDeadline({
                timeoutMs: exampleTimeoutMs(),
            });

            const fixture = await loadExampleApplicationFixtureAsync();

            await ensureExampleDarUploadedAsync(client, fixture, deadline);

            const actor = await resolveExamplePartyAsync(
                client,
                process.env,
                deadline,
            );

            const compatibility = await readWorkflowCompatibilityAsync(
                client,
                deadline,
            );

            if (actor.allocated) {
                console.warn(
                    "Warning: fallback party allocation creates durable localnet topology state and is not cleaned up.",
                );
            }

            console.warn(
                "Warning: created contracts and localnet ledger state are durable and are not cleaned up.",
            );

            const ledgerEnd = await client.stateService.getLedgerEndAsync(
                new GetLedgerEndRequest(),
                deadline.createRequestOptions(),
            );

            const savedLedgerEndOffset = ledgerEnd.offset;

            if (!savedLedgerEndOffset.trim()) {
                throw new Error("The ledger end response did not include a non-empty offset.");
            }

            const stream = client.commandCompletionService.getCompletionsAsync(
                ledgerApiV2.GetCompletionsRequest.create({
                    parties: [actor.party],
                    beginExclusive: savedLedgerEndOffset,
                }),
                deadline.createRequestOptions(),
            );

            const iterator = stream[Symbol.asyncIterator]();

            const firstNextPromise = iterator.next();

            const runId = randomBytes(12).toString("hex");

            const commandId = `completion-correlation-${runId}`;

            const completion = await submitAndWaitForCommandCompletionAsync({
                iterator,
                firstNextPromise,
                submitAsync: () => client.commandService.submitAndWaitForTransactionAsync(
                    buildCreateMessageRequest({
                        party: actor.party,
                        templateId: fixture.templateId,
                        text: `completion-correlation-${runId}`,
                        userId,
                        commandId,
                    }),
                    deadline.createRequestOptions(),
                ),
                commandId,
                expectedActor: actor.party,
                expectedUserId: userId,
            });

            console.log(`Run marker: ${runId}`);
            console.log(`Actor party: ${actor.party}`);
            console.log(`Participant version: ${compatibility.participantVersion}`);
            console.log(`Release core: ${compatibility.releaseCore}`);
            console.log(`Compatibility path: ${compatibility.path}`);
            console.log(`Completion command ID: ${completion.commandId}`);
            console.log(`Completion update ID: ${completion.updateId}`);
        },
    });
});
