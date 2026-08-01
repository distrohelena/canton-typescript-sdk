import { GrpcTransportError } from "@distrohelena/canton-typescript-sdk";
import { describe, expect, it } from "vitest";
import {
    cleanupWithoutMaskingAsync,
    mapUpdateStreamError,
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
});

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
