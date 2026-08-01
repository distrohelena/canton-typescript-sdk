import { randomBytes } from "node:crypto";
import { createExampleClient } from "./shared/localnet.js";
import { runExampleAsync } from "./shared/run.js";
import {
    archiveAndStaleContractWorkflowDefaults,
    runArchiveAndStaleContractWorkflowAsync,
} from "./shared/archive-and-stale-contract-workflow.js";
import { runArchiveAndStaleContractStandaloneAsync } from "./shared/archive-and-stale-contract-standalone.js";

runExampleAsync("archive-and-stale-contract", async () => {
    const client = createExampleClient();

    await runArchiveAndStaleContractStandaloneAsync({
        disposeAsync: () => client.disposeAsync(),
        runWorkflowAsync: () => runArchiveAndStaleContractWorkflowAsync({
            client,
            ...archiveAndStaleContractWorkflowDefaults,
            createRunId: () => randomBytes(12).toString("hex"),
            logger: console,
        }),
    });
});
