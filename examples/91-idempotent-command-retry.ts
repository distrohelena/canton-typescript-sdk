import { randomBytes } from "node:crypto";
import { RequestOptions } from "@distrohelena/canton-typescript-sdk";
import {
    buildCreateMessageRequest,
    ensureExampleDarUploadedAsync,
    extractCreatedContract,
    loadExampleApplicationFixtureAsync,
    readCreatedMessageText,
    resolveExamplePartyAsync,
} from "./shared/application-fixture.js";
import {
    assertExactlyOneActiveMessage,
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

runExampleAsync("idempotent-command-retry", async () => {
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

        const marker = `retry-marker-${runId}`;

        const commandId = `retry-command-${runId}`;

        const retryRequest = buildCreateMessageRequest({
            party: actor.party,
            templateId: fixture.templateId,
            text: marker,
            commandId,
            deduplicationPeriod: { kind: "duration", seconds: 30 },
        });

        const firstResponse =
            await client.commandService.submitAndWaitForTransactionAsync(
                retryRequest,
                new RequestOptions({ timeoutMs: deadline.remainingMs() }),
            );

        if (!firstResponse.transactionId.trim()) {
            throw new Error("The first command submission did not return a transaction ID.");
        }

        const firstCreated = extractCreatedContract(firstResponse);

        if (!firstCreated.contractId.trim()) {
            throw new Error("The first command submission did not create a contract ID.");
        }

        let duplicateCommandKind: WorkflowFailureKind;

        try {
            await client.commandService.submitAndWaitForTransactionAsync(
                retryRequest,
                new RequestOptions({ timeoutMs: deadline.remainingMs() }),
            );

            throw new Error("The duplicate command retry unexpectedly succeeded.");
        } catch (error) {
            duplicateCommandKind = classifyWorkflowFailure({
                error,
                kind: "duplicateCommand",
                operation: "commandSubmission",
                compatibility,
            });
        }

        const request = buildActiveContractsRequest({
            party: actor.party,
            templateId: fixture.templateId,
        });

        const activeMessages = await collectActiveMessagesAcrossPagesAsync({
            request,
            textMarker: marker,
            timeoutMs: deadline.remainingMs(),
            readPageAsync: pageRequest =>
                client.stateService.getActiveContractsPageAsync(
                    pageRequest,
                    new RequestOptions({ timeoutMs: deadline.remainingMs() }),
                ),
        });

        const activeMessage = assertExactlyOneActiveMessage({
            messages: activeMessages,
            textMarker: marker,
        });

        if (activeMessage.contractId !== firstCreated.contractId) {
            throw new Error(
                "The active Message for the idempotent retry did not match the first created contract.",
            );
        } else if (readCreatedMessageText(activeMessage) !== marker) {
            throw new Error("The active Message did not retain the exact retry marker.");
        }

        const activePayload = JSON.stringify(activeMessage.createArguments);

        if (activePayload === undefined) {
            throw new Error("The active Message payload could not be rendered.");
        }

        console.log(`Actor party: ${actor.party}`);
        console.log(`Command ID: ${commandId}`);
        console.log(`First transaction ID: ${firstResponse.transactionId}`);
        console.log(`First created contract: ${firstCreated.contractId}`);
        console.log(`Duplicate command kind: ${duplicateCommandKind}`);
        console.log(`Active count: ${activeMessages.length}`);
        console.log(`Participant version: ${compatibility.participantVersion}`);
        console.log(`Release core: ${compatibility.releaseCore}`);
        console.log(`Compatibility path: ${compatibility.path}`);
        console.log(`Active payload: ${activePayload}`);
    } finally {
        await client.disposeAsync();
    }
});
