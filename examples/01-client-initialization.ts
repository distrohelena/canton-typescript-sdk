import { GetLedgerApiVersionRequest } from "@distrohelena/canton-typescript-sdk";
import { createExampleClient } from "./shared/localnet.js";
import { runExampleAsync } from "./shared/run.js";

runExampleAsync("client-initialization", async () => {
    const client = createExampleClient();

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
