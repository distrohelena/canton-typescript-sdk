export interface PollUntilInit<T> {
    readonly timeoutMs: number;
    readonly pollIntervalMs: number;
    readonly readAsync: () => Promise<T>;
    readonly match: (value: T) => boolean;
    readonly createTimeoutError: (lastObserved: T | undefined) => Error;
    readonly now?: () => number;
    readonly sleepAsync?: (milliseconds: number) => Promise<void>;
}

export async function pollUntilAsync<T>(
    init: PollUntilInit<T>,
): Promise<T> {
    const now = init.now ?? Date.now;

    const sleepAsync = init.sleepAsync ?? defaultSleepAsync;

    const deadline = now() + init.timeoutMs;

    let lastObserved: T | undefined;

    let firstRead = true;

    while (firstRead || now() < deadline) {
        firstRead = false;
        lastObserved = await init.readAsync();

        if (init.match(lastObserved)) {
            return lastObserved;
        }

        const remainingMs = deadline - now();

        if (remainingMs <= 0) {
            throw init.createTimeoutError(lastObserved);
        }

        await sleepAsync(Math.min(init.pollIntervalMs, remainingMs));
    }

    throw init.createTimeoutError(lastObserved);
}

async function defaultSleepAsync(milliseconds: number): Promise<void> {
    await new Promise<void>(resolve => setTimeout(resolve, milliseconds));
}
