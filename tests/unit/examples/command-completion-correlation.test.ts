import {
    GrpcTransportError,
    SubmitCommandTransactionResponse,
    TimeoutError,
} from "@distrohelena/canton-typescript-sdk";
import { ledgerApiV2 } from "@distrohelena/canton-typescript-sdk/protobuf";
import { describe, expect, it } from "vitest";
import { submitAndWaitForCommandCompletionAsync } from "../../../examples/shared/command-completion-correlation.js";

describe("command completion correlation", () => {
    it("ignores checkpoints and unrelated command IDs before accepting an exact successful completion", async () => {
        const iterator = createIterator([
            checkpoint(),
            completionResponse({ commandId: "other" }),
            completionResponse({ actAs: ["Alice"], commandId: "expected", updateId: "transaction" }),
        ]);

        const firstNextPromise = iterator.next();

        await expect(submitAndWaitForCommandCompletionAsync({
            iterator,
            firstNextPromise,
            submitAsync: async () => submitted("transaction"),
            commandId: "expected",
            expectedActor: "Alice",
            expectedUserId: "user",
        })).resolves.toMatchObject({ commandId: "expected", updateId: "transaction" });
        expect(iterator.returnCalls).toBe(1);
    });

    it("accepts absent or zero status with the exact expected singleton actor", async () => {
        for (const status of [undefined, { code: 0, message: "ignored" }]) {
            const iterator = createIterator([
                completionResponse({ actAs: ["Alice"], commandId: "expected", status, updateId: "transaction" }),
            ]);

            await expect(submitAndWaitForCommandCompletionAsync({
                iterator,
                firstNextPromise: iterator.next(),
                submitAsync: async () => submitted("transaction"),
                commandId: "expected",
                expectedActor: "Alice",
                expectedUserId: "user",
            })).resolves.toMatchObject({ commandId: "expected" });
        }
    });

    it.each([
        ["a nonzero completion status", { status: { code: 3, message: "arbitrary prose" } }],
        ["a missing update ID", { updateId: "" }],
        ["a different user", { userId: "other-user" }],
        ["a different actor", { actAs: ["Bob"] }],
        ["additional actors", { actAs: ["Alice", "Bob"] }],
        ["a different update ID", { updateId: "different-transaction" }],
    ])("rejects an exact command ID with %s", async (_description, overrides) => {
        const iterator = createIterator([
            completionResponse({ commandId: "expected", ...overrides }),
        ]);

        await expect(submitAndWaitForCommandCompletionAsync({
            iterator,
            firstNextPromise: iterator.next(),
            submitAsync: async () => submitted("transaction"),
            commandId: "expected",
            expectedActor: "Alice",
            expectedUserId: "user",
        })).rejects.toThrow(/completion/i);
        expect(iterator.returnCalls).toBe(1);
    });

    it("rejects duplicate expected actor entries", async () => {
        const iterator = createIterator([
            completionResponse({
                actAs: ["Alice", "Alice"],
                commandId: "expected",
            }),
        ]);

        await expect(submitAndWaitForCommandCompletionAsync({
            iterator,
            firstNextPromise: iterator.next(),
            submitAsync: async () => submitted("transaction"),
            commandId: "expected",
            expectedActor: "Alice",
            expectedUserId: "user",
        })).rejects.toThrow(/actAs/i);
        expect(iterator.returnCalls).toBe(1);
    });

    it("rejects an empty submitted transaction ID before matching", async () => {
        const iterator = createIterator([
            completionResponse({ commandId: "expected", updateId: "transaction" }),
        ]);

        await expect(submitAndWaitForCommandCompletionAsync({
            iterator,
            firstNextPromise: iterator.next(),
            submitAsync: async () => submitted("  "),
            commandId: "expected",
            expectedActor: "Alice",
            expectedUserId: "user",
        })).rejects.toThrow(/transaction ID.*non-empty/i);
        expect(iterator.returnCalls).toBe(1);
    });

    it.each([
        ["a stream end", []],
        ["a response without a completion oneof", [ledgerApiV2.CompletionStreamResponse.create({ completionResponse: { oneofKind: undefined } })]],
    ])("rejects %s before a match", async (_description, responses) => {
        const iterator = createIterator(responses);

        await expect(submitAndWaitForCommandCompletionAsync({
            iterator,
            firstNextPromise: iterator.next(),
            submitAsync: async () => submitted("transaction"),
            commandId: "expected",
            expectedActor: "Alice",
            expectedUserId: "user",
        })).rejects.toThrow(/stream ended/i);
    });

    it("preserves a pre-dispatch TimeoutError unchanged", async () => {
        const timeout = new TimeoutError("submission timed out");

        const iterator = createIterator([]);

        await expect(submitAndWaitForCommandCompletionAsync({
            iterator,
            firstNextPromise: iterator.next(),
            submitAsync: async () => {
                throw timeout;
            },
            commandId: "expected",
            expectedActor: "Alice",
            expectedUserId: "user",
        })).rejects.toBe(timeout);
    });

    it.each([
        ["a GrpcTransportError deadline", grpcError("DEADLINE_EXCEEDED")],
        ["a TimeoutError", new TimeoutError("stream timed out")],
        ["an arbitrary stream error", new Error("stream failed")],
    ])("preserves %s from the first read by identity", async (_description, failure) => {
        const iterator = createIterator([], Promise.reject(failure));

        await expect(submitAndWaitForCommandCompletionAsync({
            iterator,
            firstNextPromise: iterator.next(),
            submitAsync: async () => submitted("transaction"),
            commandId: "expected",
            expectedActor: "Alice",
            expectedUserId: "user",
        })).rejects.toBe(failure);
    });

    it("preserves a later stream failure by identity", async () => {
        const failure = new Error("later stream failed");

        const iterator = createIterator([
            checkpoint(),
        ], undefined, undefined, Promise.reject(failure));

        await expect(submitAndWaitForCommandCompletionAsync({
            iterator,
            firstNextPromise: iterator.next(),
            submitAsync: async () => submitted("transaction"),
            commandId: "expected",
            expectedActor: "Alice",
            expectedUserId: "user",
        })).rejects.toBe(failure);
    });

    it("observes the already-issued first read before submission", async () => {
        const events: string[] = [];

        const iterator = createIterator([
            completionResponse({ commandId: "expected", updateId: "transaction" }),
        ]);

        const firstNextPromise = iterator.next();

        const originalCatch = firstNextPromise.catch.bind(firstNextPromise);

        firstNextPromise.catch = ((onRejected?: (reason: unknown) => unknown) => {
            events.push("observe");

            return originalCatch(onRejected);
        }) as typeof firstNextPromise.catch;

        await submitAndWaitForCommandCompletionAsync({
            iterator,
            firstNextPromise,
            submitAsync: async () => {
                events.push("submit");

                return submitted("transaction");
            },
            commandId: "expected",
            expectedActor: "Alice",
            expectedUserId: "user",
        });

        expect(events).toEqual(["observe", "submit"]);
    });

    it("surfaces a concurrent first-read failure after a successful submission", async () => {
        const first = deferred<IteratorResult<ledgerApiV2.CompletionStreamResponse>>();

        const failure = new Error("first read failed");

        const iterator = createIterator([], first.promise);

        const pending = submitAndWaitForCommandCompletionAsync({
            iterator,
            firstNextPromise: iterator.next(),
            submitAsync: async () => submitted("transaction"),
            commandId: "expected",
            expectedActor: "Alice",
            expectedUserId: "user",
        });

        first.reject(failure);
        await expect(pending).rejects.toBe(failure);
    });

    it("keeps submission failure primary when first read and cleanup fail", async () => {
        const first = deferred<IteratorResult<ledgerApiV2.CompletionStreamResponse>>();

        const firstReadFailure = new Error("first read failed");

        const submissionFailure = new Error("submission failed");

        const cleanupFailure = new Error("cleanup failed");

        const iterator = createIterator([], first.promise, async () => {
            throw cleanupFailure;
        });

        await expect(submitAndWaitForCommandCompletionAsync({
            iterator,
            firstNextPromise: iterator.next(),
            submitAsync: async () => {
                first.reject(firstReadFailure);

                await Promise.resolve();

                throw submissionFailure;
            },
            commandId: "expected",
            expectedActor: "Alice",
            expectedUserId: "user",
        })).rejects.toBe(submissionFailure);
        expect(iterator.returnCalls).toBe(1);
    });

    it("surfaces cleanup failure only when no primary operation failed", async () => {
        const cleanupFailure = new Error("cleanup failed");

        const iterator = createIterator([
            completionResponse({ commandId: "expected", updateId: "transaction" }),
        ], undefined, async () => {
            throw cleanupFailure;
        });

        await expect(submitAndWaitForCommandCompletionAsync({
            iterator,
            firstNextPromise: iterator.next(),
            submitAsync: async () => submitted("transaction"),
            commandId: "expected",
            expectedActor: "Alice",
            expectedUserId: "user",
        })).rejects.toBe(cleanupFailure);
        expect(iterator.returnCalls).toBe(1);
    });
});

function completionResponse(init: Partial<ledgerApiV2.Completion>): ledgerApiV2.CompletionStreamResponse {
    return ledgerApiV2.CompletionStreamResponse.create({
        completionResponse: {
            oneofKind: "completion",
            completion: ledgerApiV2.Completion.create({
                actAs: ["Alice"],
                commandId: "other",
                updateId: "transaction",
                userId: "user",
                ...init,
            }),
        },
    });
}

function checkpoint(): ledgerApiV2.CompletionStreamResponse {
    return ledgerApiV2.CompletionStreamResponse.create({
        completionResponse: {
            oneofKind: "offsetCheckpoint",
            offsetCheckpoint: ledgerApiV2.OffsetCheckpoint.create(),
        },
    });
}

function submitted(transactionId: string): SubmitCommandTransactionResponse {
    return new SubmitCommandTransactionResponse(transactionId, [], undefined);
}

function createIterator(
    values: readonly ledgerApiV2.CompletionStreamResponse[],
    firstNextPromise?: Promise<IteratorResult<ledgerApiV2.CompletionStreamResponse>>,
    onReturn?: () => Promise<void>,
    laterNextPromise?: Promise<IteratorResult<ledgerApiV2.CompletionStreamResponse>>,
): AsyncIterator<ledgerApiV2.CompletionStreamResponse> & { readonly returnCalls: number } {
    let index = 0;

    let returnCalls = 0;

    return {
        get returnCalls() {
            return returnCalls;
        },
        next: () => {
            if (index === 0 && firstNextPromise !== undefined) {
                index += 1;

                return firstNextPromise;
            }

            const value = values[index++];

            if (value === undefined && laterNextPromise !== undefined) {
                return laterNextPromise;
            }

            return Promise.resolve(
                value === undefined
                    ? { done: true, value: undefined }
                    : { done: false, value },
            );
        },
        return: async () => {
            returnCalls += 1;

            await onReturn?.();

            return { done: true, value: undefined };
        },
    };
}

function deferred<T>(): {
    readonly promise: Promise<T>;
    readonly reject: (reason: unknown) => void;
} {
    let reject!: (reason: unknown) => void;

    const promise = new Promise<T>((_resolve, rejectPromise) => {
        reject = rejectPromise;
    });

    return { promise, reject };
}

function grpcError(code: string): GrpcTransportError {
    const raw = Object.assign(new Error("raw RPC error"), {
        code,
        name: "RpcError",
    });

    const parsed = GrpcTransportError.fromUnknown(raw);

    if (parsed === undefined) {
        throw new Error("expected a gRPC transport error");
    }

    return parsed;
}
