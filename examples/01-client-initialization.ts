import { ledgerApiV2 } from "@distrohelena/canton-typescript-sdk/protobuf";
import { createExampleClient } from "./shared/localnet.js";
import { runExampleAsync } from "./shared/run.js";

runExampleAsync("client-initialization", async () => {
    const client = createExampleClient();

    try {
        const response =
            await client.versionService.getLedgerApiVersionAsync(
                ledgerApiV2.GetLedgerApiVersionRequest.create(),
            );

        console.log(`Ledger API version: ${response.version}`);
    } finally {
        await client.disposeAsync();
    }
});
