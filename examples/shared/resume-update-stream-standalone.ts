import { createClientDisposalLifecycle } from "./update-stream-lifecycle.js";

export async function runResumeUpdateStreamStandaloneAsync<T>(init: {
    readonly disposeAsync: () => PromiseLike<unknown> | undefined;
    readonly runWorkflowAsync: () => Promise<T>;
}): Promise<T> {
    const clientDisposal = createClientDisposalLifecycle(init.disposeAsync);

    let primaryFailed = false;

    try {
        return await init.runWorkflowAsync();
    } catch (error) {
        primaryFailed = true;

        throw error;
    } finally {
        await clientDisposal.disposeUnlessStartedAsync(primaryFailed);
    }
}
