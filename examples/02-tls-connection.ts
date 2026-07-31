import { GetLedgerApiVersionRequest } from "../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/version_service.js";
import { createExampleClient } from "./shared/localnet.js";
import { runExampleAsync } from "./shared/run.js";

runExampleAsync("tls-connection", async () => {
    // Requires a TLS localnet and its generated/default or explicitly configured CA.
    const client = createExampleClient({ tls: true });

    try {
        const response =
            await client.versionService.getLedgerApiVersionAsync(
                GetLedgerApiVersionRequest.create(),
            );

        console.log(`Ledger API version: ${response.version}`);
    } finally {
        await client.disposeAsync();
    }
});
