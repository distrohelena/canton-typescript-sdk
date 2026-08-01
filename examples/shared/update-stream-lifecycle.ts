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

export function createClientDisposalLifecycle(
    disposeAsync: () => PromiseLike<unknown> | undefined,
): {
    readonly startDisposalAsync: () => Promise<void>;
    readonly disposeUnlessStartedAsync: (primaryFailed: boolean) => Promise<void>;
} {
    let disposalStarted = false;

    let disposalPromise: Promise<void> | undefined;

    const startDisposalAsync = (): Promise<void> => {
        if (disposalPromise === undefined) {
            disposalStarted = true;
            disposalPromise = Promise.resolve().then(async () => {
                await disposeAsync();
            });
        }

        return disposalPromise;
    };

    return {
        startDisposalAsync,
        disposeUnlessStartedAsync: async primaryFailed => {
            if (!disposalStarted) {
                await cleanupWithoutMaskingAsync(
                    startDisposalAsync,
                    primaryFailed,
                );
            }
        },
    };
}

export async function expectIdleUpdateStreamTimeoutAsync<TUpdate>(init: {
    readonly iterator: AsyncIterator<TUpdate>;
    readonly firstNextPromise: Promise<IteratorResult<TUpdate>>;
    readonly cancelAsync?: () => PromiseLike<unknown> | undefined;
}): Promise<"idle-timeout"> {
    void init.firstNextPromise.catch(() => undefined);

    let primaryFailed = false;

    try {
        const next = await init.firstNextPromise;

        if (next.done) {
            throw new Error("The idle update stream ended before its expected timeout.");
        }

        throw new Error("The idle update stream yielded an update before its expected timeout.");
    } catch (error) {
        if (isDeadlineExceededError(error)) {
            primaryFailed = true;

            return "idle-timeout";
        }

        primaryFailed = true;

        throw error;
    } finally {
        await cleanupStreamAsync(init.iterator, init.cancelAsync, primaryFailed);
    }
}

export async function matchResumedUpdateAsync<TUpdate, TMatch>(init: {
    readonly iterator: AsyncIterator<TUpdate>;
    readonly firstNextPromise: Promise<IteratorResult<TUpdate>>;
    readonly reject: (update: TUpdate) => void;
    readonly match: (update: TUpdate) => TMatch | undefined;
    readonly cancelAsync?: () => PromiseLike<unknown> | undefined;
}): Promise<TMatch> {
    void init.firstNextPromise.catch(() => undefined);

    let primaryFailed = false;

    try {
        let next = await awaitStreamReadAsync(init.firstNextPromise);

        for (;;) {
            if (next.done) {
                throw new Error("The update stream ended before the resumed update was observed.");
            }

            init.reject(next.value);

            const matched = init.match(next.value);

            if (matched !== undefined) {
                return matched;
            }

            next = await awaitStreamReadAsync(init.iterator.next());
        }
    } catch (error) {
        primaryFailed = true;

        throw error;
    } finally {
        await cleanupStreamAsync(init.iterator, init.cancelAsync, primaryFailed);
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

function isDeadlineExceededError(error: unknown): error is GrpcTransportError {
    return error instanceof GrpcTransportError && error.grpcCode === "DEADLINE_EXCEEDED";
}

async function cleanupStreamAsync<TUpdate>(
    iterator: AsyncIterator<TUpdate>,
    cancelAsync: (() => PromiseLike<unknown> | undefined) | undefined,
    primaryFailed: boolean,
): Promise<void> {
    let cleanupFailure: unknown;

    let cleanupFailed = false;

    const cleanup = async (
        operation: () => PromiseLike<unknown> | undefined,
    ): Promise<void> => {
        try {
            await cleanupWithoutMaskingAsync(
                operation,
                primaryFailed || cleanupFailed,
            );
        } catch (error) {
            cleanupFailure = error;
            cleanupFailed = true;
        }
    };

    if (cancelAsync !== undefined) {
        await cleanup(cancelAsync);
    }

    await cleanup(() => iterator.return?.());

    if (cleanupFailed && !primaryFailed) {
        throw cleanupFailure;
    }
}
