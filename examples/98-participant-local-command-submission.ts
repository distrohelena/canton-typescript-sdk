import { randomBytes } from "node:crypto";
import { OperationDeadline } from "@distrohelena/canton-typescript-sdk";
import { ledgerApiV2 } from "@distrohelena/canton-typescript-sdk/protobuf";
import {
    buildCreateMessageRequest,
    ensureExampleDarUploadedAsync,
    loadExampleApplicationFixtureAsync,
    readCreatedMessageText,
    resolveExamplePartyAsync,
} from "./shared/application-fixture.js";
import { createExampleActiveContractsTraversalOptions } from "./shared/active-contracts-traversal.js";
import { buildActiveContractsRequest } from "./shared/ledger-requests.js";
import { createExampleClient, exampleTimeoutMs } from "./shared/localnet.js";
import { runExampleAsync } from "./shared/run.js";
import { readWorkflowCompatibilityAsync } from "./shared/workflow-compatibility.js";

runExampleAsync("participant-local-command-submission", async () => {
    const client = createExampleClient({
        requireBearerToken: true,
        commandSigner: {
            signAsync: async () => {
                throw new Error(
                    "participant-local submission unexpectedly invoked the external signer",
                );
            },
        },
    });

    try {
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
            "Warning: the fixture DAR upload and created contract are durable and are not cleaned up.",
        );

        const marker = `participant-local-${randomBytes(12).toString("hex")}`;

        const response = await client.commandService.submitParticipantLocalAndWaitAsync(
            buildCreateMessageRequest({
                party: actor.party,
                templateId: fixture.templateId,
                text: marker,
                commandId: `participant-local-${randomBytes(12).toString("hex")}`,
            }),
            deadline.createRequestOptions(),
        );

        const transactionId = response.transactionId;

        if (transactionId === undefined || !transactionId.trim()) {
            throw new Error(
                "The participant-local command submission did not return a transaction ID.",
            );
        }

        const matchingEvents = [];

        for await (const page of client.stateService.getActiveContractsPagesAsync(
            buildActiveContractsRequest({
                party: actor.party,
                templateId: fixture.templateId,
            }),
            createExampleActiveContractsTraversalOptions(deadline),
        )) {
            for (const responseEvent of page.activeContracts) {
                if (
                    responseEvent.contractEntry.oneofKind !== "activeContract"
                    || !ledgerApiV2.CreatedEvent.is(
                        responseEvent.contractEntry.activeContract.createdEvent,
                    )
                ) {
                    continue;
                }

                const event = responseEvent.contractEntry.activeContract.createdEvent;

                if (readCreatedMessageText(event) === marker) {
                    matchingEvents.push(event);
                }
            }
        }

        if (matchingEvents.length !== 1) {
            throw new Error(
                `Expected exactly one active Message with participant-local marker '${marker}', found ${matchingEvents.length}.`,
            );
        }

        const event = matchingEvents[0]!;

        if (!event.contractId.trim()) {
            throw new Error(
                "The active participant-local Message did not include a contract ID.",
            );
        }

        console.log(`Participant version: ${compatibility.participantVersion}`);
        console.log(`Release core: ${compatibility.releaseCore}`);
        console.log(`Compatibility path: ${compatibility.path}`);
        console.log(`Actor party: ${actor.party}`);
        console.log(`Transaction ID: ${transactionId}`);
        console.log(`Contract ID: ${event.contractId}`);
        console.log("Authorization route: participant-local");
    } finally {
        await client.disposeAsync();
    }
});
