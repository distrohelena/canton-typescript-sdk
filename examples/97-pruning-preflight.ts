import { createExampleClient } from "./shared/localnet.js";
import {
    pruningPreflightWorkflowDefaults,
    runPruningPreflightWorkflowAsync,
} from "./shared/pruning-preflight-workflow.js";
import { runExampleAsync } from "./shared/run.js";
import { runClientWorkflowWithDisposalAsync } from "./shared/update-stream-lifecycle.js";

runExampleAsync("pruning-preflight", async () => {
    const client = createExampleClient();

    await runClientWorkflowWithDisposalAsync({
        disposeAsync: () => client.disposeAsync(),
        runWorkflowAsync: () => runPruningPreflightWorkflowAsync({
            client,
            ...pruningPreflightWorkflowDefaults,
            logger: console,
        }),
    });
});
