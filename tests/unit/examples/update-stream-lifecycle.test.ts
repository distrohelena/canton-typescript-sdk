import { GrpcTransportError } from "@distrohelena/canton-typescript-sdk";
import { describe, expect, it } from "vitest";
import {
    cleanupWithoutMaskingAsync,
    mapUpdateStreamError,
    submitAndMatchUpdateAsync,
} from "../../../examples/shared/update-stream-lifecycle.js";

describe("update stream lifecycle", () => {
    it("wraps only public deadline-exceeded transport errors with timeout guidance", () => {
        const deadline = grpcError("DEADLINE_EXCEEDED");

        const mapped = mapUpdateStreamError(deadline);

        expect(mapped).toBeInstanceOf(Error);
        expect(mapped).not.toBe(deadline);
        expect(mapped).toMatchObject({ cause: deadline });
        expect((mapped as Error).message).toMatch(
            /timed out.*SDK_EXAMPLE_TIMEOUT_MS/i,
        );
    });

    it("preserves non-deadline transport errors and arbitrary values exactly", () => {
        const unavailable = grpcError("UNAVAILABLE");

        const object = { reason: "protocol" };

        const values: readonly unknown[] = [
            unavailable,
            new Error("ordinary failure"),
            object,
            "string failure",
            null,
            undefined,
        ];

        for (const value of values) {
            expect(mapUpdateStreamError(value)).toBe(value);
        }
    });

    it("awaits successful cleanup", async () => {
        let cleaned = false;

        await expect(
            cleanupWithoutMaskingAsync(async () => {
                cleaned = true;
            }, false),
        ).resolves.toBeUndefined();
        expect(cleaned).toBe(true);
    });

    it("propagates cleanup failure when no primary operation failed", async () => {
        const cleanupFailure = new Error("cleanup failed");

        await expect(
            cleanupWithoutMaskingAsync(async () => {
                throw cleanupFailure;
            }, false),
        ).rejects.toBe(cleanupFailure);
    });

    it("suppresses cleanup failure after a primary failure, including thrown undefined", async () => {
        const cleanupFailure = new Error("cleanup failed");

        let primaryFailed = false;

        try {
            throw undefined;
        } catch {
            primaryFailed = true;
        }

        await expect(
            cleanupWithoutMaskingAsync(async () => {
                throw cleanupFailure;
            }, primaryFailed),
        ).resolves.toBeUndefined();
    });

    it("starts the stream read before submission and cleans up after a successful match", async () => {
        const events: string[] = [];

        const first = deferred<IteratorResult<Update>>();

        const iterator = createIterator({
            next: () => {
                events.push("next");

                return first.promise;
            },
            onReturn: async () => {
                events.push("return");
            },
        });

        const firstNextPromise = iterator.next();

        first.resolve({ done: false, value: { contractId: "#message" } });

        await expect(
            submitAndMatchUpdateAsync({
                iterator,
                firstNextPromise,
                submitAsync: async () => {
                    events.push("submit");

                    return "#message";
                },
                match: (update, contractId) =>
                    update.contractId === contractId ? update : undefined,
                cancelAsync: async () => {
                    events.push("cancel");
                },
            }),
        ).resolves.toEqual({ contractId: "#message" });
        expect(events).toEqual(["next", "submit", "return"]);
    });

    it("cancels before iterator return when submission fails while the first read is pending", async () => {
        const events: string[] = [];

        const first = deferred<IteratorResult<Update>>();

        const submissionFailure = new Error("submission failed");

        const cancellationFailure = new Error("cancellation failed");

        const iterator = createIterator({
            next: () => first.promise,
            onReturn: async () => {
                events.push("return");
                expect(events).toContain("cancel");
            },
        });

        const firstNextPromise = iterator.next();

        await expect(
            submitAndMatchUpdateAsync({
                iterator,
                firstNextPromise,
                submitAsync: async () => {
                    events.push("submit");

                    throw submissionFailure;
                },
                match: () => undefined,
                cancelAsync: async () => {
                    events.push("cancel");

                    throw cancellationFailure;
                },
            }),
        ).rejects.toBe(submissionFailure);
        expect(events).toEqual(["submit", "cancel", "return"]);

        first.reject(new Error("late stream failure"));
        await Promise.resolve();
    });

    it("maps a deadline from iterator.next but preserves a submission deadline", async () => {
        const streamDeadline = grpcError("DEADLINE_EXCEEDED");

        const streamIterator = createIterator({
            next: async () => {
                throw streamDeadline;
            },
        });

        const streamFirstNextPromise = streamIterator.next();

        await expect(
            submitAndMatchUpdateAsync({
                iterator: streamIterator,
                firstNextPromise: streamFirstNextPromise,
                submitAsync: async () => "#message",
                match: () => undefined,
                cancelAsync: async () => undefined,
            }),
        ).rejects.toMatchObject({ cause: streamDeadline });

        const submissionDeadline = grpcError("DEADLINE_EXCEEDED");

        const submissionIterator = createIterator({
            next: () => deferred<IteratorResult<Update>>().promise,
        });

        const submissionFirstNextPromise = submissionIterator.next();

        await expect(
            submitAndMatchUpdateAsync({
                iterator: submissionIterator,
                firstNextPromise: submissionFirstNextPromise,
                submitAsync: async () => {
                    throw submissionDeadline;
                },
                match: () => undefined,
                cancelAsync: async () => undefined,
            }),
        ).rejects.toBe(submissionDeadline);
    });
});

type Update = { readonly contractId: string };

function deferred<T>(): {
    readonly promise: Promise<T>;
    readonly resolve: (value: T) => void;
    readonly reject: (reason?: unknown) => void;
} {
    let resolve: (value: T) => void;

    let reject: (reason?: unknown) => void;

    const promise = new Promise<T>((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });

    return { promise, resolve: resolve!, reject: reject! };
}

function createIterator(init: {
    readonly next: () => Promise<IteratorResult<Update>>;
    readonly onReturn?: () => Promise<void>;
}): AsyncIterator<Update> {
    return {
        next: init.next,
        return: async () => {
            await init.onReturn?.();

            return { done: true, value: undefined };
        },
    };
}

function grpcError(code: string): GrpcTransportError {
    const rawError = Object.assign(new Error("transport failure"), {
        name: "RpcError",
        code,
        meta: {},
    });

    const parsed = GrpcTransportError.fromUnknown(rawError);

    if (parsed === undefined) {
        throw new Error("Expected the test fixture to produce a GrpcTransportError.");
    }

    return parsed;
}
