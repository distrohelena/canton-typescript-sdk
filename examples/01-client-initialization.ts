import { GetLedgerApiVersionRequest } from "../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/version_service.js";
import { createExampleClient } from "./shared/localnet.js";
import { runExampleAsync } from "./shared/run.js";

runExampleAsync("client-initialization", async () => {
    const client = createExampleClient();

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
