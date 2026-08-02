import { randomBytes } from "node:crypto";
import { createExampleClient } from "./shared/localnet.js";
import { runExampleAsync } from "./shared/run.js";
import { runClientWorkflowWithDisposalAsync } from "./shared/update-stream-lifecycle.js";
import {
    runUpdateLookupReconciliationWorkflowAsync,
    updateLookupReconciliationWorkflowDefaults,
} from "./shared/update-lookup-reconciliation-workflow.js";

runExampleAsync("update-lookup-reconciliation", async () => {
    const client = createExampleClient();

    await runClientWorkflowWithDisposalAsync({
        disposeAsync: () => client.disposeAsync(),
        runWorkflowAsync: () => runUpdateLookupReconciliationWorkflowAsync({
            client,
            ...updateLookupReconciliationWorkflowDefaults,
            createRunId: () => randomBytes(12).toString("hex"),
            logger: console,
        }),
    });
});
