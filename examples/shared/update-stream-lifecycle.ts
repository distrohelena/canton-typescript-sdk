import { GrpcTransportError } from "@distrohelena/canton-typescript-sdk";

export function mapUpdateStreamError(error: unknown): unknown {
    if (
        error instanceof GrpcTransportError
        && error.grpcCode === "DEADLINE_EXCEEDED"
    ) {
        return new Error(
            "Update stream timed out. Increase SDK_EXAMPLE_TIMEOUT_MS to allow the stream to observe the submitted Message.",
            { cause: error },
        );
    }

    return error;
}

export async function cleanupWithoutMaskingAsync(
    cleanup: () => PromiseLike<unknown> | undefined,
    primaryFailed: boolean,
): Promise<void> {
    try {
        await cleanup();
    } catch (error) {
        if (!primaryFailed) {
            throw error;
        }
    }
}

export async function submitAndMatchUpdateAsync<TUpdate, TTarget, TMatch>(init: {
    readonly iterator: AsyncIterator<TUpdate>;
    readonly firstNextPromise: Promise<IteratorResult<TUpdate>>;
    readonly submitAsync: () => Promise<TTarget>;
    readonly match: (update: TUpdate, target: TTarget) => TMatch | undefined;
    readonly cancelAsync: () => PromiseLike<unknown> | undefined;
}): Promise<TMatch> {
    void init.firstNextPromise.catch(() => undefined);

    let primaryFailed = false;

    try {
        let target: TTarget;

        try {
            target = await init.submitAsync();
        } catch (error) {
            primaryFailed = true;

            await cleanupWithoutMaskingAsync(init.cancelAsync, true);

            throw error;
        }

        let next = await awaitStreamReadAsync(init.firstNextPromise);

        for (;;) {
            if (next.done) {
                throw new Error("The update stream ended before the submitted Message was observed.");
            }

            const matched = init.match(next.value, target);

            if (matched !== undefined) {
                return matched;
            }

            next = await awaitStreamReadAsync(init.iterator.next());
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

async function awaitStreamReadAsync<T>(
    nextPromise: Promise<IteratorResult<T>>,
): Promise<IteratorResult<T>> {
    try {
        return await nextPromise;
    } catch (error) {
        throw mapUpdateStreamError(error);
    }
}
