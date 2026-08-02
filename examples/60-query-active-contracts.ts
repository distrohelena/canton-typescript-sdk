import {
    OperationDeadline,
    RequestOptions,
} from "@distrohelena/canton-typescript-sdk";
import {
    buildCreateMessageRequest,
    ensureExampleDarUploadedAsync,
    extractCreatedContract,
    loadExampleApplicationFixtureAsync,
    resolveExamplePartyAsync,
} from "./shared/application-fixture.js";
import {
    buildActiveContractsRequest,
    findActiveMessageAcrossPagesAsync,
} from "./shared/ledger-requests.js";
import { createExampleClient, exampleTimeoutMs } from "./shared/localnet.js";
import { runExampleAsync } from "./shared/run.js";

const messageText = "Hello from the Canton TypeScript SDK";

runExampleAsync("query-active-contracts", async () => {
    const client = createExampleClient();

    try {
        const deadline = new OperationDeadline({ timeoutMs: exampleTimeoutMs() });

        const fixture = await loadExampleApplicationFixtureAsync();

        await ensureExampleDarUploadedAsync(client, fixture, deadline);

        const actor = await resolveExamplePartyAsync(client, process.env, deadline);

        if (actor.allocated) {
            console.warn(
                "Warning: fallback party allocation creates durable localnet topology state and is not cleaned up.",
            );
        }

        console.warn(
            "Warning: created contracts and localnet ledger state are durable and are not cleaned up.",
        );

        const createResponse =
            await client.commandService.submitAndWaitForTransactionAsync(
                buildCreateMessageRequest({
                    party: actor.party,
                    templateId: fixture.templateId,
                    text: "Hello from the Canton TypeScript SDK",
                }),
                deadline.createRequestOptions(),
            );

        const created = extractCreatedContract(createResponse);

        const request = buildActiveContractsRequest({
            party: actor.party,
            templateId: fixture.templateId,
        });

        const message = await findActiveMessageAcrossPagesAsync({
            request,
            contractId: created.contractId,
            timeoutMs: deadline.remainingTimeoutMs(),
            readPageAsync: (pageRequest, remainingTimeoutMs) =>
                client.stateService.getActiveContractsPageAsync(
                    pageRequest,
                    new RequestOptions({ timeoutMs: remainingTimeoutMs }),
                ),
        });

        if (message === undefined) {
            throw new Error(
                `Created Message '${created.contractId}' was not present in the active-contract snapshot.`,
            );
        }

        if (message.createArguments === undefined) {
            throw new Error(
                `Created Message '${created.contractId}' did not include a decoded create payload.`,
            );
        }

        const textValue = message.createArguments.fields.find(
            (field) => field.label === "text",
        )?.value;

        if (textValue?.sum.oneofKind !== "text") {
            throw new Error(
                `Created Message '${created.contractId}' did not contain the expected text field.`,
            );
        } else if (textValue.sum.text !== messageText) {
            throw new Error(
                `Created Message '${created.contractId}' did not contain the expected text '${messageText}'.`,
            );
        }

        const payload = JSON.stringify(message.createArguments);

        if (payload === undefined) {
            throw new Error(
                `Created Message '${created.contractId}' has a create payload that cannot be rendered.`,
            );
        }

        console.log(`Actor party: ${actor.party}`);
        console.log(`Contract ID: ${created.contractId}`);
        console.log(`Created payload: ${payload}`);
    } finally {
        await client.disposeAsync();
    }
});
