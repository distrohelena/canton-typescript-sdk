import { GrpcTransportError } from "@distrohelena/canton-typescript-sdk";
import { describe, expect, it } from "vitest";
import {
    cleanupWithoutMaskingAsync,
    createClientDisposalLifecycle,
    expectIdleUpdateStreamTimeoutAsync,
    mapUpdateStreamError,
    matchResumedUpdateAsync,
    runClientWorkflowWithDisposalAsync,
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

        const clientDisposal = createClientDisposalLifecycle(async () => {
            events.push("dispose");

            throw cancellationFailure;
        });

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

                    await clientDisposal.startDisposalAsync();
                },
            }),
        ).rejects.toBe(submissionFailure);

        await expect(
            clientDisposal.disposeUnlessStartedAsync(true),
        ).resolves.toBeUndefined();
        expect(events).toEqual(["submit", "cancel", "dispose", "return"]);

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

    it("recognizes a structured idle deadline and disposes its lazy stream exactly once", async () => {
        const deadline = grpcError("DEADLINE_EXCEEDED");

        const events: string[] = [];

        const first = deferred<IteratorResult<Update>>();

        const clientDisposal = createClientDisposalLifecycle(async () => {
            events.push("dispose");
        });

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

        const timeout = expectIdleUpdateStreamTimeoutAsync({
            iterator,
            firstNextPromise,
            cancelAsync: clientDisposal.startDisposalAsync,
        });

        first.reject(deadline);

        await expect(timeout).resolves.toBe("idle-timeout");
        await clientDisposal.disposeUnlessStartedAsync(false);

        expect(events).toEqual(["next", "dispose", "return"]);
    });

    it("preserves an expected idle timeout when cancellation rejects", async () => {
        const deadline = grpcError("DEADLINE_EXCEEDED");

        const cancellationFailure = new Error("cancel failed");

        let cancellationObserved = false;

        const iterator = createIterator({
            next: async () => {
                throw deadline;
            },
        });

        const firstNextPromise = iterator.next();

        await expect(
            expectIdleUpdateStreamTimeoutAsync({
                iterator,
                firstNextPromise,
                cancelAsync: async () => {
                    cancellationObserved = true;

                    throw cancellationFailure;
                },
            }),
        ).resolves.toBe("idle-timeout");

        expect(cancellationObserved).toBe(true);
    });

    it("preserves an expected idle timeout when iterator cleanup rejects", async () => {
        const deadline = grpcError("DEADLINE_EXCEEDED");

        const returnFailure = new Error("return failed");

        let returnObserved = false;

        const iterator = createIterator({
            next: async () => {
                throw deadline;
            },
            onReturn: async () => {
                returnObserved = true;

                throw returnFailure;
            },
        });

        const firstNextPromise = iterator.next();

        await expect(
            expectIdleUpdateStreamTimeoutAsync({
                iterator,
                firstNextPromise,
                cancelAsync: async () => undefined,
            }),
        ).resolves.toBe("idle-timeout");

        expect(returnObserved).toBe(true);
    });

    it("does not mistake an ordinary update-stream deadline for an expected idle timeout", async () => {
        const deadline = grpcError("DEADLINE_EXCEEDED");

        const iterator = createIterator({
            next: async () => {
                throw deadline;
            },
        });

        const firstNextPromise = iterator.next();

        await expect(
            matchResumedUpdateAsync({
                iterator,
                firstNextPromise,
                reject: () => undefined,
                match: () => undefined,
                cancelAsync: async () => undefined,
            }),
        ).rejects.toMatchObject({ cause: deadline });
    });

    it("propagates unexpected idle events, stream ends, and ordinary read errors", async () => {
        const eventIterator = createIterator({
            next: async () => ({ done: false, value: { contractId: "#unexpected" } }),
        });

        const eventFirst = eventIterator.next();

        await expect(
            expectIdleUpdateStreamTimeoutAsync({
                iterator: eventIterator,
                firstNextPromise: eventFirst,
                cancelAsync: async () => undefined,
            }),
        ).rejects.toThrow(/yielded an update/i);

        const endedIterator = createIterator({
            next: async () => ({ done: true, value: undefined }),
        });

        const endedFirst = endedIterator.next();

        await expect(
            expectIdleUpdateStreamTimeoutAsync({
                iterator: endedIterator,
                firstNextPromise: endedFirst,
                cancelAsync: async () => undefined,
            }),
        ).rejects.toThrow(/ended before/i);

        const ordinaryFailure = new Error("ordinary stream failure");

        const failedIterator = createIterator({
            next: async () => {
                throw ordinaryFailure;
            },
        });

        const failedFirst = failedIterator.next();

        await expect(
            expectIdleUpdateStreamTimeoutAsync({
                iterator: failedIterator,
                firstNextPromise: failedFirst,
                cancelAsync: async () => undefined,
            }),
        ).rejects.toBe(ordinaryFailure);
    });

    it("rejects a pre-offset update, skips unrelated updates, and returns the post-offset match", async () => {
        const events: string[] = [];

        const first = deferred<IteratorResult<Update>>();

        const updates: IteratorResult<Update>[] = [
            { done: false, value: { contractId: "#unrelated" } },
            { done: false, value: { contractId: "#post" } },
        ];

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

        let nextIndex = 0;

        iterator.next = async () => updates[nextIndex++]!;

        const match = matchResumedUpdateAsync({
            iterator,
            firstNextPromise,
            reject: update => {
                if (update.contractId === "#pre") {
                    throw new Error("Pre-offset update was replayed.");
                }
            },
            match: update => update.contractId === "#post" ? update : undefined,
            cancelAsync: async () => {
                events.push("cancel");
            },
        });

        first.resolve({
            done: false,
            value: { contractId: "#unrelated-first" },
        });

        await expect(match).resolves.toEqual({ contractId: "#post" });
        expect(events).toEqual(["next", "cancel", "return"]);
    });

    it("propagates resumed-stream contract, end, and read failures without cleanup masking", async () => {
        const contractFailure = new Error("Pre-offset update was replayed.");

        const readFailure = new Error("ordinary stream failure");

        const contractIterator = createIterator({
            next: async () => ({ done: false, value: { contractId: "#pre" } }),
            onReturn: async () => {
                throw new Error("return failed");
            },
        });

        const contractFirst = contractIterator.next();

        await expect(
            matchResumedUpdateAsync({
                iterator: contractIterator,
                firstNextPromise: contractFirst,
                reject: () => {
                    throw contractFailure;
                },
                match: () => undefined,
                cancelAsync: async () => {
                    throw new Error("cancel failed");
                },
            }),
        ).rejects.toBe(contractFailure);

        const endedIterator = createIterator({
            next: async () => ({ done: true, value: undefined }),
        });

        const endedFirst = endedIterator.next();

        await expect(
            matchResumedUpdateAsync({
                iterator: endedIterator,
                firstNextPromise: endedFirst,
                reject: () => undefined,
                match: () => undefined,
                cancelAsync: async () => undefined,
            }),
        ).rejects.toThrow(/ended before/i);

        const failedIterator = createIterator({
            next: async () => {
                throw readFailure;
            },
        });

        const failedFirst = failedIterator.next();

        await expect(
            matchResumedUpdateAsync({
                iterator: failedIterator,
                firstNextPromise: failedFirst,
                reject: () => undefined,
                match: () => undefined,
                cancelAsync: async () => undefined,
            }),
        ).rejects.toBe(readFailure);
    });
});

describe("client workflow lifecycle", () => {
    it("returns the workflow value and disposes exactly once", async () => {
        let disposeCalls = 0;

        await expect(
            runClientWorkflowWithDisposalAsync({
                disposeAsync: async () => {
                    disposeCalls += 1;
                },
                runWorkflowAsync: async () => "workflow-result",
            }),
        ).resolves.toBe("workflow-result");
        expect(disposeCalls).toBe(1);
    });

    it("rethrows the exact workflow failure when disposal also fails", async () => {
        const workflowFailure = new Error("workflow failed");

        let disposeCalls = 0;

        await expect(
            runClientWorkflowWithDisposalAsync({
                disposeAsync: async () => {
                    disposeCalls += 1;

                    throw new Error("dispose failed");
                },
                runWorkflowAsync: async () => {
                    throw workflowFailure;
                },
            }),
        ).rejects.toBe(workflowFailure);
        expect(disposeCalls).toBe(1);
    });

    it("surfaces the exact disposal failure after workflow success", async () => {
        const disposalFailure = new Error("dispose failed");

        let disposeCalls = 0;

        await expect(
            runClientWorkflowWithDisposalAsync({
                disposeAsync: async () => {
                    disposeCalls += 1;

                    throw disposalFailure;
                },
                runWorkflowAsync: async () => undefined,
            }),
        ).rejects.toBe(disposalFailure);
        expect(disposeCalls).toBe(1);
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
