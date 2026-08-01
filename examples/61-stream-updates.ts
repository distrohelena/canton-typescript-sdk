import {
    GetLedgerEndRequest,
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
    buildUpdatesRequest,
    matchCreatedMessageUpdate,
} from "./shared/ledger-requests.js";
import { createExampleClient, exampleTimeoutMs } from "./shared/localnet.js";
import { runExampleAsync } from "./shared/run.js";
import {
    createClientDisposalLifecycle,
    submitAndMatchUpdateAsync,
} from "./shared/update-stream-lifecycle.js";

runExampleAsync("stream-updates", async () => {
    const client = createExampleClient();

    let outerPrimaryFailed = false;

    const clientDisposal = createClientDisposalLifecycle(
        () => client.disposeAsync(),
    );

    try {
        const fixture = await loadExampleApplicationFixtureAsync();

        await ensureExampleDarUploadedAsync(client, fixture);

        const actor = await resolveExamplePartyAsync(client);

        if (actor.allocated) {
            console.warn(
                "Warning: fallback party allocation creates durable localnet topology state and is not cleaned up.",
            );
        }

        console.warn(
            "Warning: created contracts and localnet ledger state are durable and are not cleaned up.",
        );

        const timeoutMs = exampleTimeoutMs();

        const ledgerEnd = await client.stateService.getLedgerEndAsync(
            new GetLedgerEndRequest(),
            new RequestOptions({ timeoutMs }),
        );

        const stream = client.updateService.getUpdatesAsync(
            buildUpdatesRequest({
                beginExclusive: ledgerEnd.offset,
                party: actor.party,
                templateId: fixture.templateId,
            }),
            new RequestOptions({ timeoutMs }),
        );

        const iterator = stream[Symbol.asyncIterator]();

        const firstUpdatePromise = iterator.next();

        void firstUpdatePromise.catch(() => undefined);

        const matched = await submitAndMatchUpdateAsync({
            iterator,
            firstNextPromise: firstUpdatePromise,
            submitAsync: async () => {
                const createResponse =
                    await client.commandService.submitAndWaitForTransactionAsync(
                        buildCreateMessageRequest({
                            party: actor.party,
                            templateId: fixture.templateId,
                            text: "Hello from the Canton TypeScript SDK",
                        }),
                    );

                return extractCreatedContract(createResponse).contractId;
            },
            match: (response, contractId) =>
                matchCreatedMessageUpdate({ response, contractId }),
            cancelAsync: clientDisposal.startDisposalAsync,
        });

        console.log(`Update ID: ${matched.updateId}`);
        console.log(`Offset: ${matched.offset}`);
        console.log(`Created contract ID: ${matched.contractId}`);
    } catch (error) {
        outerPrimaryFailed = true;

        throw error;
    } finally {
        await clientDisposal.disposeUnlessStartedAsync(outerPrimaryFailed);
    }
});
