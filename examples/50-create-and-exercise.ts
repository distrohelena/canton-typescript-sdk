import {
    buildCreateMessageRequest,
    buildReplaceMessageTextRequest,
    ensureExampleDarUploadedAsync,
    extractCreatedContract,
    extractReplacementContracts,
    loadExampleApplicationFixtureAsync,
    resolveExamplePartyAsync,
} from "./shared/application-fixture.js";
import { createExampleClient } from "./shared/localnet.js";
import { runExampleAsync } from "./shared/run.js";

runExampleAsync("create-and-exercise", async () => {
    const client = createExampleClient();

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

        const createResponse =
            await client.commandService.submitAndWaitForTransactionAsync(
                buildCreateMessageRequest({
                    party: actor.party,
                    templateId: fixture.templateId,
                    text: "Hello from the Canton TypeScript SDK",
                }),
            );

        const original = extractCreatedContract(createResponse);

        const replaceResponse =
            await client.commandService.submitAndWaitForTransactionAsync(
                buildReplaceMessageTextRequest({
                    party: actor.party,
                    templateId: fixture.templateId,
                    contractId: original.contractId,
                    replacement: "Updated by ReplaceText",
                }),
            );

        const { archivedContractId, replacementContractId } =
            extractReplacementContracts(replaceResponse);

        if (archivedContractId !== original.contractId) {
            throw new Error(
                `ReplaceText archived '${archivedContractId}', but the original contract was '${original.contractId}'.`,
            );
        } else if (
            !replacementContractId.trim()
            || replacementContractId === original.contractId
        ) {
            throw new Error(
                `ReplaceText must create a new non-empty contract ID, but received '${replacementContractId}' after replacing '${original.contractId}'.`,
            );
        }

        console.log(`Actor party: ${actor.party}`);
        console.log(`Original contract: ${original.contractId}`);
        console.log(`Replacement contract: ${replacementContractId}`);
    } finally {
        await client.disposeAsync();
    }
});
