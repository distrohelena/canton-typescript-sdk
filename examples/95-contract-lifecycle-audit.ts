import { randomBytes } from "node:crypto";
import { createExampleClient } from "./shared/localnet.js";
import { runExampleAsync } from "./shared/run.js";
import {
    contractLifecycleAuditWorkflowDefaults,
    runContractLifecycleAuditWorkflowAsync,
} from "./shared/contract-lifecycle-audit-workflow.js";
import { runClientWorkflowWithDisposalAsync } from "./shared/update-stream-lifecycle.js";

runExampleAsync("contract-lifecycle-audit", async () => {
    const client = createExampleClient();

    await runClientWorkflowWithDisposalAsync({
        disposeAsync: () => client.disposeAsync(),
        runWorkflowAsync: () => runContractLifecycleAuditWorkflowAsync({
            client,
            ...contractLifecycleAuditWorkflowDefaults,
            createRunId: () => randomBytes(12).toString("hex"),
            logger: console,
        }),
    });
});
