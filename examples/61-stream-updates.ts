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
    cleanupWithoutMaskingAsync,
    mapUpdateStreamError,
} from "./shared/update-stream-lifecycle.js";

runExampleAsync("stream-updates", async () => {
    const client = createExampleClient();

    let outerPrimaryFailed = false;

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

        let innerPrimaryFailed = false;

        try {
            const createResponse =
                await client.commandService.submitAndWaitForTransactionAsync(
                    buildCreateMessageRequest({
                        party: actor.party,
                        templateId: fixture.templateId,
                        text: "Hello from the Canton TypeScript SDK",
                    }),
                );

            const created = extractCreatedContract(createResponse);

            let next = await firstUpdatePromise;

            for (;;) {
                if (next.done) {
                    throw new Error(
                        `The update stream ended before Message '${created.contractId}' was observed.`,
                    );
                }

                const matched = matchCreatedMessageUpdate({
                    response: next.value,
                    contractId: created.contractId,
                });

                if (matched !== undefined) {
                    console.log(`Update ID: ${matched.updateId}`);
                    console.log(`Offset: ${matched.offset}`);
                    console.log(`Created contract ID: ${matched.contractId}`);

                    break;
                }

                next = await iterator.next();
            }
        } catch (error) {
            innerPrimaryFailed = true;

            throw error;
        } finally {
            await cleanupWithoutMaskingAsync(
                () => iterator.return?.(),
                innerPrimaryFailed,
            );
        }
    } catch (error) {
        outerPrimaryFailed = true;

        throw mapUpdateStreamError(error);
    } finally {
        await cleanupWithoutMaskingAsync(
            () => client.disposeAsync(),
            outerPrimaryFailed,
        );
    }
});
