import { randomBytes } from "node:crypto";
import { createExampleClient } from "./shared/localnet.js";
import { runExampleAsync } from "./shared/run.js";
import {
    idempotentCommandRetryWorkflowDefaults,
    runIdempotentCommandRetryWorkflowAsync,
} from "./shared/idempotent-command-retry-workflow.js";
import { runClientWorkflowWithDisposalAsync } from "./shared/update-stream-lifecycle.js";

runExampleAsync("idempotent-command-retry", async () => {
    const client = createExampleClient();

    await runClientWorkflowWithDisposalAsync({
        disposeAsync: () => client.disposeAsync(),
        runWorkflowAsync: () => runIdempotentCommandRetryWorkflowAsync({
            client,
            ...idempotentCommandRetryWorkflowDefaults,
            createRunId: () => randomBytes(12).toString("hex"),
            logger: console,
        }),
    });
});
