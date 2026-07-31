import { GetLedgerApiVersionRequest } from "@distrohelena/canton-typescript-sdk";
import { createExampleClient } from "./shared/localnet.js";
import { runExampleAsync } from "./shared/run.js";

runExampleAsync("tls-connection", async () => {
    // Requires a TLS localnet and its generated/default or explicitly configured CA.
    const client = createExampleClient({ tls: true });

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
