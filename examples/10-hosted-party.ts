import { AllocatePartyRequest } from "@distrohelena/canton-typescript-sdk";
import { createExampleClient, createPartyHint } from "./shared/localnet.js";
import { runExampleAsync } from "./shared/run.js";

runExampleAsync("hosted-party", async () => {
    const client = createExampleClient();

    try {
        const partyHint = createPartyHint();
        const userId = (process.env.SDK_EXAMPLE_USER_ID ?? "ledger-api-user").trim();

        if (process.env.SDK_EXAMPLE_USER_ID !== undefined && !userId) {
            throw new Error("SDK_EXAMPLE_USER_ID must not be empty.");
        }

        console.warn(
            "Warning: party allocation creates durable localnet topology state and is not cleaned up.",
        );

        const party = await client.partyManagementService.allocatePartyAsync(
            new AllocatePartyRequest({
                partyIdHint: partyHint,
                displayName: partyHint,
                userId,
            }),
        );

        console.log(`Hosted party: ${party.party}`);
    } finally {
        await client.disposeAsync();
    }
});
