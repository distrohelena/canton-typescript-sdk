import { SubmitCommandTransactionResponse } from "@distrohelena/canton-typescript-sdk";
import { ledgerApiV2 } from "@distrohelena/canton-typescript-sdk/protobuf";
import { cleanupWithoutMaskingAsync } from "./update-stream-lifecycle.js";

export async function submitAndWaitForCommandCompletionAsync(init: {
    readonly iterator: AsyncIterator<ledgerApiV2.CompletionStreamResponse>;
    readonly firstNextPromise: Promise<IteratorResult<ledgerApiV2.CompletionStreamResponse>>;
    readonly submitAsync: () => Promise<SubmitCommandTransactionResponse>;
    readonly commandId: string;
    readonly expectedActor: string;
    readonly expectedUserId: string;
}): Promise<ledgerApiV2.Completion> {
    void init.firstNextPromise.catch(() => undefined);

    let primaryFailed = false;

    try {
        const submitted = await init.submitAsync();

        if (!submitted.transactionId.trim()) {
            throw new Error("Submitted transaction ID must be non-empty.");
        }

        let next = await init.firstNextPromise;

        for (;;) {
            if (next.done) {
                throw new Error("Completion stream ended before a matching completion.");
            }

            const matched = matchExactCompletion(next.value, submitted, init);

            if (matched !== undefined) {
                return matched;
            }

            next = await init.iterator.next();
        }
    } catch (error) {
        primaryFailed = true;

        throw error;
    } finally {
        await cleanupWithoutMaskingAsync(
            () => init.iterator.return?.(),
            primaryFailed,
        );
    }
}

function matchExactCompletion(
    response: ledgerApiV2.CompletionStreamResponse,
    submitted: SubmitCommandTransactionResponse,
    init: {
        readonly commandId: string;
        readonly expectedActor: string;
        readonly expectedUserId: string;
    },
): ledgerApiV2.Completion | undefined {
    if (response.completionResponse.oneofKind !== "completion") {
        return undefined;
    }

    const completion = response.completionResponse.completion;

    if (completion.commandId !== init.commandId) {
        return undefined;
    } else if (completion.userId !== init.expectedUserId) {
        throw new Error("Matching completion has an unexpected user ID.");
    } else if (completion.status !== undefined && completion.status.code !== 0) {
        throw new Error("Matching completion has a non-success status.");
    } else if (!completion.updateId) {
        throw new Error("Matching completion has no update ID.");
    } else if (!sameActorSet(completion.actAs, [init.expectedActor])) {
        throw new Error("Matching completion has unexpected actAs parties.");
    } else if (completion.updateId !== submitted.transactionId) {
        throw new Error("Matching completion update ID differs from the submitted transaction ID.");
    }

    return completion;
}

function sameActorSet(actual: readonly string[], expected: readonly string[]): boolean {
    const actualSet = new Set(actual);

    const expectedSet = new Set(expected);

    return actualSet.size === actual.length
        && expectedSet.size === expected.length
        && actualSet.size === expectedSet.size
        && [...actualSet].every(actor => expectedSet.has(actor));
}
