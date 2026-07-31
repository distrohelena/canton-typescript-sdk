import { GetLedgerApiVersionRequest } from "@distrohelena/canton-typescript-sdk";
import { createExampleClient } from "./shared/localnet.js";
import { runExampleAsync } from "./shared/run.js";

runExampleAsync("jwt-authentication", async () => {
    // Requires SDK_EXAMPLE_BEARER_TOKEN or per-surface bearer-token variables.
    const client = createExampleClient({ requireBearerToken: true });

    try {
        const response =
            await client.versionService.getLedgerApiVersionAsync(
                new GetLedgerApiVersionRequest(),
            );

        console.log(`Ledger API version: ${response.version}`);
    } finally {
        await client.disposeAsync();
    }
});
