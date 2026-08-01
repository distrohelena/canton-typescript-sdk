import { randomBytes } from "node:crypto";
import { createExampleClient } from "./shared/localnet.js";
import { runExampleAsync } from "./shared/run.js";
import {
    resumeUpdateStreamWorkflowDefaults,
    runResumeUpdateStreamWorkflowAsync,
} from "./shared/resume-update-stream-workflow.js";

runExampleAsync("resume-update-stream", async () => {
    const client = createExampleClient();

    try {
        await runResumeUpdateStreamWorkflowAsync({
            client,
            ...resumeUpdateStreamWorkflowDefaults,
            createRunId: () => randomBytes(12).toString("hex"),
            logger: console,
        });
    } finally {
        await client.disposeAsync();
    }
});
