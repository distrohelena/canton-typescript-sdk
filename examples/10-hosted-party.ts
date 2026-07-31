import { AllocatePartyRequest } from "@distrohelena/canton-typescript-sdk";
import { createExampleClient, createPartyHint } from "./shared/localnet.js";
import { runExampleAsync } from "./shared/run.js";

runExampleAsync("hosted-party", async () => {
    const client = createExampleClient();

    try {
        const partyHint = createPartyHint();

        console.warn(
            "Warning: party allocation creates durable localnet topology state and is not cleaned up.",
        );

        const party = await client.partyManagementService.allocatePartyAsync(
            new AllocatePartyRequest({
                partyIdHint: partyHint,
                displayName: partyHint,
            }),
        );

        console.log(`Hosted party: ${party.party}`);
    } finally {
        await client.disposeAsync();
    }
});
