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
